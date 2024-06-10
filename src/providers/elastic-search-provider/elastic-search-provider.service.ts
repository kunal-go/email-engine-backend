import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { randomUUID } from 'crypto';

@Injectable()
export class ElasticSearchProviderService {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async createDocument(index: string, document: any) {
    const id = randomUUID();
    const createdDocument = await this.elasticsearchService.create({
      id,
      index,
      body: document,
    });
    return createdDocument.body._id;
  }

  async listDocuments(index: string, query?: any) {
    const documents = await this.elasticsearchService.search({
      index,
      body: { query },
    });
    return documents.body.hits.hits.map((hit) => ({
      id: hit._id,
      ...hit._source,
    }));
  }

  async deleteDocument(index: string, id: string) {
    await this.elasticsearchService.delete({ id, index });
  }
}
