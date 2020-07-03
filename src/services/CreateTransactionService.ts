import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionRepository from '../repositories/TransactionsRepository';
import SeachOrCreateCategoryService from './SeachOrCreateCategoryService';

import Transaction from '../models/Transaction';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionRepository);
    const categoryService = new SeachOrCreateCategoryService();

    const categoryDTO = await categoryService.execute({ category });

    const { total } = await transactionRepository.getBalance();

    if (type === 'outcome' && value > total) {
      throw new AppError(
        'Transação não permitida o valor ultrapassa o saldo em conta',
      );
    }

    const transaction = transactionRepository.create({
      title,
      value,
      type,
      category_id: categoryDTO.id,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
