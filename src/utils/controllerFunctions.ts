import { isObject } from 'class-validator';
const dataSource: any = require('../server');
import { canBeNumber } from './common';

/**
 * Get database LIKE operator
 */
export const getLikeCommand = (): string => {
  return dataSource.options.type === 'postgres'
    ? 'ILIKE'
    : 'LIKE';
};

/**
 * Get current database type
 */
export const getDbType = (): string => {
  return String(dataSource.options.type);
};

/**
 * Filter request data and return only valid entity columns
 */
export const getEntityColumnWithData = (
  entity: any,
  data: Record<string, any>
): Record<string, any> => {
  const repository = dataSource.getRepository(entity);

  const validColumns = repository.metadata.columns.map((column: any) => column.propertyName);

  return Object.keys(data).reduce(
    (acc: Record<string, any>, key) => {
      if (validColumns.includes(key)) {
        acc[key] = data[key];
      }

      return acc;
    },
    {}
  );
};

/**
 * Build dynamic WHERE conditions
 */
export const getEntityColumnWithConditions = (
  entity: any,
  data: Record<string, any>
) => {
  const repository = dataSource.getRepository(entity);

  const conditions: string[] = [];

  const filteredData: Record<string, any> = {};

  repository.metadata.columns.forEach((column: any) => {
    const propertyName = column.propertyName;

    const value = data[propertyName];

    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return;
    }

    const columnName = column.databaseName;

    const columnType = String(column.type).toLowerCase();

    /**
     * String Columns
     */
    if (
      [
        'varchar',
        'nvarchar',
        'char',
        'text',
        'string',
      ].includes(columnType)
    ) {
      conditions.push(
        `${columnName} ${getLikeCommand()} :${propertyName}`
      );

      filteredData[propertyName] = `%${value}%`;

      return;
    }

    /**
     * Number Columns
     */
    if (
      [
        'int',
        'integer',
        'bigint',
        'smallint',
        'float',
        'double',
        'decimal',
        'numeric',
        'number',
      ].includes(columnType)
    ) {
      conditions.push(
        `${columnName} = :${propertyName}`
      );

      filteredData[propertyName] = canBeNumber(value)
        ? Number(value)
        : value;

      return;
    }

    /**
     * Boolean Columns
     */
    if (
      ['bool', 'boolean'].includes(columnType)
    ) {
      conditions.push(
        `${columnName} = :${propertyName}`
      );

      filteredData[propertyName] =
        value === true ||
        value === 'true' ||
        value === 1 ||
        value === '1';

      return;
    }

    /**
     * Enum Columns
     */
    if (columnType === 'enum') {
      const enumValues = Array.isArray(column.enum)
        ? column.enum
        : isObject(column.enum)
        ? Object.values(column.enum)
        : [];

      if (enumValues.includes(value)) {
        conditions.push(
          `${columnName} = :${propertyName}`
        );

        filteredData[propertyName] = value;
      }

      return;
    }

    /**
     * Date Columns
     */
    if (
      [
        'date',
        'datetime',
        'timestamp',
      ].includes(columnType)
    ) {
      conditions.push(
        `${columnName} = :${propertyName}`
      );

      filteredData[propertyName] = value;

      return;
    }

    /**
     * Default
     */
    conditions.push(
      `${columnName} = :${propertyName}`
    );

    filteredData[propertyName] = value;
  });

  return {
    queryConditions: conditions.join(' AND '),
    filteredData,
  };
};

/**
 * Get final SQL query with values
 * For debugging only
 */
export const getFinalQuery = (
  queryBuilder: any
): string => {
  let sql = queryBuilder.getQuery();

  const params =
    queryBuilder.getParameters();

  Object.entries(params).forEach(
    ([key, value]) => {
      let replacement: any = value;

      if (typeof value === 'string') {
        replacement = `'${value}'`;
      }

      if (value === null) {
        replacement = 'NULL';
      }

      sql = sql.replace(
        new RegExp(`:${key}\\b`, 'g'),
        String(replacement)
      );
    }
  );

  return sql;
};

/**
 * Pagination Helper
 */
export const getPagination = (
  page: number = 1,
  limit: number = 10
) => {
  page = Number(page) || 1;
  limit = Number(limit) || 10;

  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
};

/**
 * Apply Pagination on Query Builder
 */
export const applyPagination = (
  queryBuilder: any,
  page: number = 1,
  limit: number = 10
) => {
  const { offset } = getPagination(
    page,
    limit
  );

  queryBuilder.skip(offset);

  queryBuilder.take(limit);

  return queryBuilder;
};

/**
 * Pagination Response
 */
export const paginationResponse = (
  data: any[],
  total: number,
  page: number,
  limit: number
) => {
  const totalPages = Math.ceil(
    total / limit
  );

  return {
    data,
    pagination: {
      totalRecords: total,
      totalPages,
      currentPage: Number(page),
      limit: Number(limit),
      hasNextPage:
        Number(page) < totalPages,
      hasPreviousPage:
        Number(page) > 1,
    },
  };
};