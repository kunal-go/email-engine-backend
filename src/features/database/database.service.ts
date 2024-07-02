import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { randomUUID } from 'crypto';
import { BaseEntity } from '../../common/base-entity';
import { PayloadShape } from '../../common/types';

@Injectable()
export class DatabaseService {
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
      await this.elasticsearchService.indices.refresh({ index });
      return createdDocument.body._id;
    } catch (err) {
      throw new UnprocessableEntityException(
        'Error while creating document in elastic search',
      );
    }
  }

  async getDocumentList<T extends BaseEntity>(
    Entity: new (...args: any[]) => T,
    {
      index,
      paginate,
      query,
      sort,
    }: {
      index: string;
      query?: any;
      sort?: any;
      paginate?: { page: number; size: number };
    },
  ): Promise<{ count: number; list: T[] }> {
    try {
      const [count, documents] = await Promise.all([
        this.elasticsearchService.count({ index, body: { query } }),
        this.elasticsearchService.search({
          index,
          body: { query, sort },
          ...(paginate
            ? {
                from: (paginate.page - 1) * paginate.size,
                size: paginate.size,
              }
            : {}),
        }),
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
    await this.elasticsearchService.indices.refresh({ index });
  }

  async updateDocument<T extends BaseEntity>(
    index: string,
    id: string,
    updatedFields: Partial<PayloadShape<T>>,
  ) {
    await this.elasticsearchService.update({
      id,
      index,
      body: { doc: updatedFields },
    });
    await this.elasticsearchService.indices.refresh({ index });
  }

  async deleteIndex(index: string) {
    await this.elasticsearchService.indices.delete({
      index,
      ignore_unavailable: true,
    });
  }
}
