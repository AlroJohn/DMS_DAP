import { prisma } from '../lib/prisma';
import { getSocketInstance } from '../socket';

export class DocumentCheckoutService {
  /**
   * Checks out a document file for the given user.
   */
  async checkoutFile(fileId: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { account_id: true },
    });

    if (!user || !user.account_id) {
      return { success: false, error: 'User not found.', statusCode: 404 };
    }

    const documentFile = await prisma.documentFile.findUnique({
      where: { file_id: fileId },
    });

    if (!documentFile) {
      return { success: false, error: 'Document file not found.', statusCode: 404 };
    }

    const existingCheckout = await prisma.userCheckout.findFirst({
      where: { file_id: fileId },
      include: {
        checked_out_by_account: { include: { user: true } },
      },
    });

    if (existingCheckout) {
      if (existingCheckout.checked_out_by === user.account_id) {
        return {
          success: false,
          error: 'You have already checked out this file.',
          statusCode: 409,
        };
      }
      const checkedOutByUser = existingCheckout.checked_out_by_account.user;
      const userName = checkedOutByUser
        ? `${checkedOutByUser.first_name} ${checkedOutByUser.last_name}`
        : 'another user';
      return {
        success: false,
        error: `File is already checked out by ${userName}.`,
        statusCode: 409,
      };
    }

    try {
      const [, updatedFile] = await prisma.$transaction([
        prisma.userCheckout.create({
          data: {
            file_id: fileId,
            checked_out_by: user.account_id,
          },
        }),
        prisma.documentFile.update({
          where: { file_id: fileId },
          data: { checkout: true },
        }),
      ]);

      const io = getSocketInstance();
      io.emit('file-lock-updated', {
        fileId,
        locked: true,
        documentId: documentFile.document_id,
      });

      return { success: true, data: updatedFile };
    } catch (error) {
      console.error('Checkout transaction failed:', error);
      return {
        success: false,
        error: 'Failed to checkout file due to a database error.',
        statusCode: 500,
      };
    }
  }

  /**
   * Checks in a document file, releasing the lock.
   */
  async checkinFile(fileId: string, userId: string) {
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { account_id: true },
    });

    if (!user || !user.account_id) {
      return { success: false, error: 'User not found.', statusCode: 404 };
    }

    const documentFile = await prisma.documentFile.findUnique({
      where: { file_id: fileId },
    });

    if (!documentFile) {
      return { success: false, error: 'Document file not found.', statusCode: 404 };
    }

    const checkoutRecord = await prisma.userCheckout.findFirst({
      where: { file_id: fileId },
    });

    if (!checkoutRecord) {
      return { success: false, error: 'File is not checked out.', statusCode: 400 };
    }

    if (checkoutRecord.checked_out_by !== user.account_id) {
      return {
        success: false,
        error: 'You cannot check in a file checked out by another user.',
        statusCode: 403,
      };
    }

    try {
      const [updatedFile] = await prisma.$transaction([
        prisma.documentFile.update({
          where: { file_id: fileId },
          data: { checkout: false },
        }),
        prisma.userCheckout.deleteMany({
          where: { file_id: fileId },
        }),
      ]);

      const io = getSocketInstance();
      io.emit('file-lock-updated', {
        fileId,
        locked: false,
        documentId: documentFile.document_id,
      });

      return { success: true, data: updatedFile };
    } catch (error) {
      console.error('Checkin transaction failed:', error);
      return {
        success: false,
        error: 'Failed to checkin file due to a database error.',
        statusCode: 500,
      };
    }
  }

  /**
   * Allows a user with appropriate permissions to override a file checkout.
   */
  async overrideFileCheckout(fileId: string, userId: string) {
    // TODO: Add permission check for overriding locks
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { account_id: true },
    });

    if (!user || !user.account_id) {
      return { success: false, error: 'User not found.', statusCode: 404 };
    }

    const documentFile = await prisma.documentFile.findUnique({
      where: { file_id: fileId },
    });

    if (!documentFile) {
      return { success: false, error: 'Document file not found.', statusCode: 404 };
    }

    const checkoutRecord = await prisma.userCheckout.findFirst({
      where: { file_id: fileId },
    });

    if (!checkoutRecord) {
      return { success: false, error: 'File is not checked out.', statusCode: 400 };
    }

    const originalCheckoutUserAccountId = checkoutRecord.checked_out_by;

    try {
      const [updatedFile] = await prisma.$transaction([
        prisma.documentFile.update({
          where: { file_id: fileId },
          data: { checkout: false },
        }),
        prisma.userCheckout.deleteMany({
          where: { file_id: fileId },
        }),
      ]);

      const io = getSocketInstance();
      io.emit('file-lock-updated', {
        fileId,
        locked: false,
        documentId: documentFile.document_id,
      });

      // Notify the original user that their lock was overridden
      if (originalCheckoutUserAccountId) {
        io.to(`account-${originalCheckoutUserAccountId}`).emit(
          'file-checkout-overridden',
          {
            fileId,
            documentId: documentFile.document_id,
            overriddenBy: userId,
          },
        );
      }

      return { success: true, data: updatedFile };
    } catch (error) {
      console.error('Override checkout transaction failed:', error);
      return {
        success: false,
        error: 'Failed to override checkout due to a database error.',
        statusCode: 500,
      };
    }
  }

  /**
   * Gets the current checkout status of a file.
   */
  async getCheckoutStatus(fileId: string) {
    const checkoutRecord = await prisma.userCheckout.findFirst({
      where: { file_id: fileId },
      select: {
        checked_out_at: true,
        checked_out_by: true,
      },
    });

    if (!checkoutRecord) {
      return { success: true, data: null };
    }

    return { success: true, data: checkoutRecord };
  }
}
