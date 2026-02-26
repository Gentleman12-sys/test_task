import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tariff_data', (table) => {
    table.increments('id').primary();
    table.date('date').notNullable();
    table.integer('nmid').notNullable();
    table.string('box_type_name').notNullable();
    table.string('size').nullable();
    table.integer('warehouse_id').notNullable();
    table.string('warehouse_name').notNullable();
    table.decimal('coef', 10, 4).notNullable();
    table.decimal('amount', 12, 2).notNullable();
    table.integer('region_id').notNullable();
    table.string('region_name').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['date', 'nmid', 'warehouse_id', 'region_id'], {
      indexName: 'tariff_data_unique_daily',
    });

    table.index(['date', 'coef'], 'idx_date_coef');
    table.index(['date'], 'idx_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tariff_data');
}