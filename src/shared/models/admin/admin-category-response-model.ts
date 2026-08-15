import { ApiProperty } from "@nestjs/swagger";

export class AdminCategoryModel {
  @ApiProperty({ example: 1, description: 'Type ID' })
  id: number;

  @ApiProperty({ example: "Ubisoft", description: 'Type name' })
  name: string;

  @ApiProperty({ example: "Ubisoft is a French video game company", description: 'Type description' })
  description?: string | null;

  @ApiProperty({ example: 5, description: 'Number of products in this Type' })
  productCount: number;

  @ApiProperty({ example: "2022-01-01T00:00:00.000Z", description: 'Timestamp of Type creation' })
  createdAt?: Date;
}