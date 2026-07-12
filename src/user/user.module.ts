import { Module } from '@nestjs/common';
import { UserService } from './user.service';

/**
 * Owns user persistence. Exports UserService so Auth and Product modules
 * can reuse it (no duplicated query logic).
 */
@Module({
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
