import { getRepository } from 'typeorm';
import Category from '../models/Category';

interface Request {
  category: string;
}

class SeachOrCreateCategoryService {
  public async execute({ category }: Request): Promise<Category> {
    const categoryRepository = getRepository(Category);

    const categorySearch = await categoryRepository.findOne({
      where: { title: category },
    });

    if (!categorySearch) {
      const categoryCreate = categoryRepository.create({
        title: category,
      });

      await categoryRepository.save(categoryCreate);

      return categoryCreate;
    }

    return categorySearch;
  }
}

export default SeachOrCreateCategoryService;
