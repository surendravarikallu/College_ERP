import { prisma } from '../../core/database/prisma.client';
import { APIError } from '../../core/common/exceptions/api.error';

export class LibraryService {

  static async addBook(data: {
    title: string; author: string; isbn: string;
    publisher?: string; edition?: string; subject?: string;
    totalCopies?: number;
  }) {
    return prisma.libraryBook.create({
      data: {
        title: data.title,
        author: data.author,
        isbn: data.isbn,
        publisher: data.publisher,
        edition: data.edition,
        subject: data.subject,
        totalCopies: data.totalCopies || 1,
        availableCopies: data.totalCopies || 1,
      },
    });
  }

  static async searchBooks(query: string, page: number = 1, limit: number = 25) {
    limit = Math.min(limit, 100);
    const where = {
      isActive: true,
      OR: [
        { title: { contains: query, mode: 'insensitive' as const } },
        { author: { contains: query, mode: 'insensitive' as const } },
        { isbn: { contains: query, mode: 'insensitive' as const } },
      ],
    };

    const [books, total] = await Promise.all([
      prisma.libraryBook.findMany({ where, skip: (page - 1) * limit, take: limit }),
      prisma.libraryBook.count({ where }),
    ]);

    return { books, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async issueBook(data: { bookId: string; cardId: string; dueDate: string }) {
    const book = await prisma.libraryBook.findUnique({ where: { id: data.bookId } });
    if (!book) throw new APIError('NOT_FOUND', 'Book not found.');
    if (book.availableCopies <= 0) throw new APIError('CONFLICT', 'No copies available.');

    const card = await prisma.libraryCard.findUnique({ where: { id: data.cardId } });
    if (!card || !card.isActive) throw new APIError('NOT_FOUND', 'Library card not found or inactive.');

    const activeIssues = await prisma.bookIssue.count({ where: { cardId: data.cardId, isReturned: false } });
    if (activeIssues >= 5) throw new APIError('CONFLICT', 'Maximum 5 books allowed at a time.');

    return prisma.$transaction(async (tx) => {
      const issue = await tx.bookIssue.create({
        data: {
          bookId: data.bookId,
          cardId: data.cardId,
          dueDate: new Date(data.dueDate),
        },
      });
      await tx.libraryBook.update({
        where: { id: data.bookId },
        data: { availableCopies: { decrement: 1 } },
      });
      return issue;
    });
  }

  static async returnBook(issueId: string) {
    const issue = await prisma.bookIssue.findUnique({ where: { id: issueId } });
    if (!issue) throw new APIError('NOT_FOUND', 'Issue record not found.');
    if (issue.isReturned) throw new APIError('CONFLICT', 'Book already returned.');

    const now = new Date();
    const overdueDays = Math.max(0, Math.floor((now.getTime() - issue.dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    const fine = overdueDays * 5;

    return prisma.$transaction(async (tx) => {
      await tx.bookIssue.update({
        where: { id: issueId },
        data: { returnDate: now, isReturned: true, fine },
      });
      await tx.libraryBook.update({
        where: { id: issue.bookId },
        data: { availableCopies: { increment: 1 } },
      });
      return { returned: true, overdueDays, fine };
    });
  }

  static async createCard(studentId: string) {
    const existing = await prisma.libraryCard.findUnique({ where: { studentId } });
    if (existing) return existing;

    const cardNumber = `LIB-${Date.now().toString().slice(-8)}`;
    return prisma.libraryCard.create({
      data: { studentId, cardNumber },
    });
  }

  static async getOverdueBooks() {
    return prisma.bookIssue.findMany({
      where: { isReturned: false, dueDate: { lt: new Date() } },
      include: {
        book: { select: { title: true, author: true } },
        card: { include: { student: { select: { name: true, rollNumber: true } } } },
      },
    });
  }

  static async getStats() {
    const [totalBooks, availableBooks, issuedBooks, overdueBooks] = await Promise.all([
      prisma.libraryBook.count({ where: { isActive: true } }),
      prisma.libraryBook.aggregate({ where: { isActive: true }, _sum: { availableCopies: true } }),
      prisma.bookIssue.count({ where: { isReturned: false } }),
      prisma.bookIssue.count({ where: { isReturned: false, dueDate: { lt: new Date() } } }),
    ]);

    return {
      totalBooks,
      availableCopies: availableBooks._sum.availableCopies || 0,
      issuedCount: issuedBooks,
      overdueCount: overdueBooks,
    };
  }
}
