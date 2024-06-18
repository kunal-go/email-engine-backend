import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { Configuration } from '../../configuration';
import { AccountService } from '../../features/account/account.service';
import { AccountEntity } from '../../features/account/types';
import { MailFolderEntity } from '../../features/mail-folder/types';
import {
  MsGraphMailFolder,
  MsGraphMessage,
  MsGraphRemovedMessage,
  MsGraphUser,
} from './types';

@Injectable()
export class MsGraphApiProviderService {
  constructor(
    private readonly config: ConfigService<Configuration>,
    private readonly accountService: AccountService,
  ) {}

  async callApi(payload: {
    account?: AccountEntity;
    url: string;
    method: 'get' | 'post' | 'put' | 'delete';
    body?: any;
    headers?: Record<string, string>;
    actionMessage?: string;
  }) {
    try {
      const headers = payload.headers || {};
      if (payload.account?.accessToken) {
        headers.Authorization = `Bearer ${payload.account?.accessToken}`;
      }

      const response = await axios({
        method: payload.method,
        url: payload.url,
        data: payload.body,
        headers,
      });
      return response.data;
    } catch (err) {
      if (!(err instanceof AxiosError)) {
        throw err;
      }

      const code = err.response?.data?.error?.code;
      if (code === 'InvalidAuthenticationToken') {
        if (payload.account) {
          console.log('Access token expired, refreshing tokens');
          const tokens = await this.createTokensByRefreshToken(
            payload.account.refreshToken,
          );
          await this.accountService.updateAccountTokens(
            payload.account,
            tokens,
          );
          payload.account.accessToken = tokens.accessToken;
          payload.account.refreshToken = tokens.refreshToken;

          console.log('Tokens refreshed, updating account tokens');
          return await this.callApi(payload);
        }
      }

      if (payload.actionMessage) {
        console.log(
          'Axios error while ' + payload.actionMessage,
          err.response?.data.error,
        );
        throw new UnprocessableEntityException(
          `Got error while ${payload.actionMessage} from microsoft`,
        );
      }

      console.log('Axios error', err.message);
      throw new UnprocessableEntityException(
        'Something went wrong while syncing data from microsoft',
      );
    }
  }

  async createTokens(
    authorizationCode: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tenantId = this.config.get('MS_GRAPH_TENANT_ID');

    try {
      const resp = await axios.post(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
          client_id: this.config.get('MS_GRAPH_CLIENT_ID'),
          scope: 'openid profile email User.Read Mail.Read offline_access',
          code: authorizationCode,
          redirect_uri: this.config.get('MS_GRAPH_REDIRECT_URI'),
          grant_type: 'authorization_code',
          client_secret: this.config.get('MS_GRAPH_CLIENT_SECRET'),
        },
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      const accessToken = resp.data.access_token;
      const refreshToken = resp.data.refresh_token;

      if (!accessToken || !refreshToken) {
        throw new UnprocessableEntityException(
          'Unable to get access token and refresh token from Microsoft',
        );
      }
      return { accessToken, refreshToken };
    } catch (err) {
      if (err instanceof AxiosError) {
        console.log(
          'Axios error while creating tokens',
          err.response?.data?.error,
        );
        throw new UnprocessableEntityException(
          'Something while linking account with Microsoft',
        );
      }
      throw err;
    }
  }

  async createTokensByRefreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tenantId = this.config.get('MS_GRAPH_TENANT_ID');

    try {
      const resp = await axios.post(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
          client_id: this.config.get('MS_GRAPH_CLIENT_ID'),
          scope: 'openid profile email User.Read Mail.Read offline_access',
          redirect_uri: this.config.get('MS_GRAPH_REDIRECT_URI'),
          grant_type: 'refresh_token',
          client_secret: this.config.get('MS_GRAPH_CLIENT_SECRET'),
          refresh_token: refreshToken,
        },
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      const accessToken = resp.data.access_token;
      const newRefreshToken = resp.data.refresh_token;

      if (!accessToken || !newRefreshToken) {
        throw new UnprocessableEntityException(
          'Unable to get access token and refresh token from Microsoft',
        );
      }
      return { accessToken, refreshToken: newRefreshToken };
    } catch (err) {
      if (err instanceof AxiosError) {
        console.log(
          'Axios error while creating tokens',
          err.response?.data.error,
        );
        throw new UnprocessableEntityException(
          'Something while linking account with Microsoft',
        );
      }
      throw err;
    }
  }

  async getUser(accessToken: string): Promise<MsGraphUser> {
    try {
      const response = await axios.get(`https://graph.microsoft.com/v1.0/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.data;
    } catch (err) {
      if (err instanceof AxiosError) {
        console.log('Axios error while fetching user details', err.message);
        throw new UnprocessableEntityException(
          'Something while fetching user details from Microsoft',
        );
      }
      throw err;
    }
  }

  async listMailFolders(payload: {
    account: AccountEntity;
  }): Promise<MsGraphMailFolder[]> {
    const response = await this.callApi({
      ...payload,
      method: 'get',
      url: `https://graph.microsoft.com/v1.0/me/mailFolders`,
      actionMessage: 'fetching mail folders',
    });
    return response.value;
  }

  async getDeltaMessages(payload: {
    account: AccountEntity;
    mailFolder: MailFolderEntity;
  }): Promise<{
    updatedList: MsGraphMessage[];
    removedList: MsGraphRemovedMessage[];
    deltaToken?: string;
    skipToken?: string;
  }> {
    const url = new URL(
      `https://graph.microsoft.com/v1.0/me/mailFolders/${payload.mailFolder.externalId}/messages/delta`,
    );
    if (payload.mailFolder.deltaToken) {
      url.searchParams.append('$deltatoken', payload.mailFolder.deltaToken);
    }
    if (payload.mailFolder.skipToken) {
      url.searchParams.append('$skipToken', payload.mailFolder.skipToken);
    }

    const response = await this.callApi({
      account: payload.account,
      method: 'get',
      url: url.toString(),
      headers: { 'odata.maxpagesize': '20' },
      actionMessage: 'fetching delta messages from mail folder',
    });

    const deltaLink = response['@odata.deltaLink'];
    const deltaToken = deltaLink?.split('$deltatoken=')[1];
    const nextLink = response['@odata.nextLink'];
    const skipToken = nextLink?.split('$skiptoken=')[1];

    const removedList = response.value?.filter((el) => el['@removed']) || [];
    const updatedList = response.value?.filter((el) => !el['@removed']) || [];
    return { updatedList, removedList, deltaToken, skipToken };
  }
}
