import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { randomUUID } from 'crypto';

@Injectable()
export class ElasticSearchProviderService {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async createDocument(index: string, document: any): Promise<string> {
    const id = randomUUID();
    const createdDocument = await this.elasticsearchService.create({
      id,
      index,
      body: document,
    });
    return createdDocument.body._id;
  }

  async listDocuments(
    index: string,
    query?: any,
  ): Promise<{ count: number; list: any[] }> {
    try {
      const [count, documents] = await Promise.all([
        this.elasticsearchService.count({ index, body: { query } }),
        this.elasticsearchService.search({ index, body: { query } }),
      ]);

      return {
        count: count.body.count,
        list: documents.body.hits.hits.map((hit) => ({
          id: hit._id,
          ...hit._source,
        })),
      };
    } catch (err) {
      if (err.meta.statusCode === 404) {
        return { count: 0, list: [] };
      }
      throw err;
    }
  }

  async deleteDocument(index: string, id: string) {
    await this.elasticsearchService.delete({ id, index });
  }
}
