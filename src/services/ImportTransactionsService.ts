// import csvParse from 'csv-parse';
// import path from 'path';
// import fs from 'fs';
// import { getRepository } from 'typeorm';
// import Transaction from '../models/Transaction';
// import uploadConfig from '../config/upload';

// interface Request {
//   filename: string;
// }

// class ImportTransactionsService {
//   public async execute({ filename }: Request): Promise<Transaction[]> {
//     const repository = getRepository(Transaction);
//     const csvFilePath = path.join(uploadConfig.directory, filename);

//     const readCSVStream = fs.createReadStream(csvFilePath);

//     const parseStream = csvParse({
//       from_line: 2,
//       ltrim: true,
//       rtrim: true,
//     });

//     const parseCSV = readCSVStream.pipe(parseStream);

//     const transactions = [] as Transaction[];

//     parseCSV.on('data', async line => {
//       const transaction = repository.create({
//         title: line[0],
//         type: line[1],
//         value: line[2],
//         category: line[3],
//       });

//       await repository.save(transaction);

//       transactions.push(transaction);
//     });

//     await new Promise(resolve => {
//       parseCSV.on('end', resolve);
//     });

//     return transactions;
//   }
// }
import csvParse from 'csv-parse';
import fs from 'fs';

import { getCustomRepository, getRepository, In } from 'typeorm';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const contactsReadStrem = fs.createReadStream(filePath);

    const parsers = csvParse({
      from_line: 2,
    });
    const parseCSV = contactsReadStrem.pipe(parsers);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;
      categories.push(category);
      transactions.push({ title, type, value, category });
    });
    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });
    const existentCategoriesTitle = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitle.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );
    await categoriesRepository.save(newCategories);
    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );
    await transactionsRepository.save(createdTransactions);
    await fs.promises.unlink(filePath);
    return createdTransactions;
  }
}
export default ImportTransactionsService;
