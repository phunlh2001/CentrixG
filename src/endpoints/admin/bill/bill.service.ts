import { PrismaService } from '@app/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BillService {
  constructor(private readonly prisma: PrismaService) {}
}
