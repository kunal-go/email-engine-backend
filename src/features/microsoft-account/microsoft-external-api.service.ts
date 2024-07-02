import {
  Inject,
  Injectable,
  UnprocessableEntityException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { Configuration } from '../../configuration';
import { AccountEntity, AccountType } from '../account/types';
import { FolderEntity } from '../folder/types';
import { MicrosoftAccountService } from './microsoft-account.service';
import {
  MicrosoftExternalFolder,
  MicrosoftExternalMessage,
  MicrosoftExternalRemovedMessage,
  MicrosoftExternalUser,
} from './types';

@Injectable()
export class MicrosoftExternalApiService {
  constructor(
    private readonly config: ConfigService<Configuration>,
    @Inject(forwardRef(() => MicrosoftAccountService))
    private readonly microsoftAccountService: MicrosoftAccountService,
  ) {}

  async callApi(payload: {
    account?: AccountEntity;
    url: string;
    method: 'get' | 'post' | 'put' | 'delete';
    body?: any;
    headers?: Record<string, string>;
    actionMessage?: string;
  }) {
    const metadata = payload.account?.metadata;
    if (metadata?.type !== AccountType.Microsoft) {
      throw new UnprocessableEntityException('Account type is not Microsoft');
    }

    try {
      const headers = payload.headers || {};
      if (metadata.accessToken) {
        headers.Authorization = `Bearer ${metadata.accessToken}`;
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
          const tokens = await this.createAuthTokensByRefreshToken(
            metadata.refreshToken,
          );
          console.log('Tokens refreshed, updating account metadata');

          await this.microsoftAccountService.updateMicrosoftAccountAuthTokens(
            payload.account,
            tokens,
          );
          metadata.accessToken = tokens.accessToken;
          metadata.refreshToken = tokens.refreshToken;

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

  async createAuthTokensByCode(
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

  async createAuthTokensByRefreshToken(
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

  async fetchUser(accessToken: string): Promise<MicrosoftExternalUser> {
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

  async fetchFolderList(payload: {
    account: AccountEntity;
  }): Promise<MicrosoftExternalFolder[]> {
    const response = await this.callApi({
      ...payload,
      method: 'get',
      url: `https://graph.microsoft.com/v1.0/me/mailFolders`,
      actionMessage: 'fetching mail folders',
    });
    return response.value;
  }

  async fetchDeltaMessageList(payload: {
    account: AccountEntity;
    mailFolder: FolderEntity;
  }): Promise<{
    updatedList: MicrosoftExternalMessage[];
    removedList: MicrosoftExternalRemovedMessage[];
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
    const MAX_PAGE_SIZE = '20';

    const response = await this.callApi({
      account: payload.account,
      method: 'get',
      url: url.toString(),
      headers: { 'odata.maxpagesize': MAX_PAGE_SIZE },
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
