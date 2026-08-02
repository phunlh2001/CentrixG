import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';

/**
 * Owns user persistence and UserController endpoints. Exports UserService
 * so Auth and Product modules can reuse it.
 */
@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
