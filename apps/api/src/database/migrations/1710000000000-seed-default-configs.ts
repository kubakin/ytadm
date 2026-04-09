import { MigrationInterface, QueryRunner } from 'typeorm';
import { DEFAULT_CONFIGS } from '../../modules/configs/default-configs';

export class SeedDefaultConfigs1710000000000 implements MigrationInterface {
  name = 'SeedDefaultConfigs1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "config_entries" (
        "id" uuid PRIMARY KEY,
        "key" character varying NOT NULL UNIQUE,
        "value" text NOT NULL,
        "description" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    for (const item of DEFAULT_CONFIGS) {
      await queryRunner.query(
        `
          INSERT INTO "config_entries" ("id", "key", "value", "description")
          VALUES (md5(random()::text || clock_timestamp()::text)::uuid, $1, $2, $3)
          ON CONFLICT ("key") DO NOTHING
        `,
        [item.key, item.value, item.description],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "config_entries"`);
  }
}
