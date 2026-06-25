import { TenantQuery } from "./TenantQuery";


export class ProductService {

  constructor(private productRepo: any) {}

  async findAll(user: any) {

    return this.productRepo.find({
      where: TenantQuery.apply(user)
    });
  }
}