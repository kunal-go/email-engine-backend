export abstract class BaseEntity {
  id: string;
  index: string;

  constructor(id: string, index: string) {
    this.id = id;
    this.index = index;
  }
}
