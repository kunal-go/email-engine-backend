import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { Configuration } from '../../configuration';
import { MsGraphMailFolder, MsGraphUser } from './types';

@Injectable()
export class MsGraphApiProviderService {
  constructor(private readonly config: ConfigService<Configuration>) {}

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
        console.log('Axios error while creating tokens', err.message);
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

  async listMailFolders({
    accessToken,
  }: {
    accessToken: string;
  }): Promise<MsGraphMailFolder[]> {
    try {
      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/me/mailFolders`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      return response.data.value;
    } catch (err) {
      if (err instanceof AxiosError) {
        console.log(
          'Axios error while fetching mail folders',
          err.response?.data.error,
        );
        throw new UnprocessableEntityException(
          'Something while fetching mail folder from Microsoft',
        );
      }
      throw err;
    }
  }
}
