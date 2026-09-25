import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { UserModule } from '../user/user.module';
import { SupabaseModule } from '../../services/supabase/supabase.module';
import { R2Module } from '../../services/r2/r2.module';

@Module({
  imports: [UserModule, SupabaseModule, R2Module],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
