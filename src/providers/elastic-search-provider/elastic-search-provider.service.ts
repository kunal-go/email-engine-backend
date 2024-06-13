import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { randomUUID } from 'crypto';
import { BaseEntity } from '../../common/base-entity';
import { PayloadShape } from '../../common/types';

@Injectable()
export class ElasticSearchProviderService {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async createDocument<T extends BaseEntity>(
    index: string,
    document: PayloadShape<T>,
  ): Promise<string> {
    try {
      const id = randomUUID();
      const createdDocument = await this.elasticsearchService.create({
        id,
        index,
        body: document,
      });
      return createdDocument.body._id;
    } catch (err) {
      throw new UnprocessableEntityException(
        'Error while creating document in elastic search',
      );
    }
  }

  async listDocuments<T extends BaseEntity>(
    Entity: new (...args: any[]) => T,
    index: string,
    query?: any,
  ): Promise<{ count: number; list: T[] }> {
    try {
      const [count, documents] = await Promise.all([
        this.elasticsearchService.count({ index, body: { query } }),
        this.elasticsearchService.search({ index, body: { query } }),
      ]);

      return {
        count: count.body.count,
        list: documents.body.hits.hits.map(
          (hit) => new Entity(index, hit._id, { ...hit._source }),
        ),
      };
    } catch (err) {
      if (err.meta.statusCode === 404) {
        return { count: 0, list: [] };
      }
      throw new UnprocessableEntityException(
        'Error while listing documents from elastic search',
      );
    }
  }

  async deleteDocument(index: string, id: string) {
    await this.elasticsearchService.delete({ id, index });
  }

  async updateDocument<T extends BaseEntity>(
    index: string,
    id: string,
    document: Partial<PayloadShape<T>>,
  ) {
    await this.elasticsearchService.update({
      id,
      index,
      body: { doc: document },
    });
  }
}
