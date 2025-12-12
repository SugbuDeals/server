/**
 * Deal Configuration Validator
 * 
 * Custom validator for deal configurations using class-validator.
 * Ensures that deal-specific fields are properly set based on the deal type.
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { DealType } from 'generated/prisma';
import { PROMOTION_ERRORS } from '../constants/error-messages';

/**
 * Validator constraint for deal configuration validation.
 * Checks that required fields are present and valid for each deal type.
 */
@ValidatorConstraint({ name: 'isDealConfigValid', async: false })
export class IsDealConfigValidConstraint
  implements ValidatorConstraintInterface
{
  /**
   * Validates deal configuration based on deal type.
   * 
   * @param value - The value being validated (not used, we check the entire DTO)
   * @param args - Validation arguments containing the DTO object
   * @returns true if valid, false otherwise
   */
  validate(value: any, args: ValidationArguments): boolean {
    const dto = args.object as any;
    const dealType = dto.dealType;

    if (!dealType) {
      return false;
    }

    try {
      switch (dealType) {
        case DealType.PERCENTAGE_DISCOUNT:
          return this.validatePercentageDiscount(dto);

        case DealType.FIXED_DISCOUNT:
          return this.validateFixedDiscount(dto);

        case DealType.BOGO:
          return this.validateBogo(dto);

        case DealType.BUNDLE:
          return this.validateBundle(dto);

        case DealType.QUANTITY_DISCOUNT:
          return this.validateQuantityDiscount(dto);

        case DealType.VOUCHER:
          return this.validateVoucher(dto);

        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Validates percentage discount configuration
   */
  private validatePercentageDiscount(dto: any): boolean {
    if (dto.percentageOff === undefined || dto.percentageOff === null) {
      return false;
    }
    return (
      typeof dto.percentageOff === 'number' &&
      dto.percentageOff > 0 &&
      dto.percentageOff <= 100
    );
  }

  /**
   * Validates fixed discount configuration
   */
  private validateFixedDiscount(dto: any): boolean {
    if (dto.fixedAmountOff === undefined || dto.fixedAmountOff === null) {
      return false;
    }
    return typeof dto.fixedAmountOff === 'number' && dto.fixedAmountOff > 0;
  }

  /**
   * Validates BOGO deal configuration
   */
  private validateBogo(dto: any): boolean {
    if (
      dto.buyQuantity === undefined ||
      dto.buyQuantity === null ||
      dto.getQuantity === undefined ||
      dto.getQuantity === null
    ) {
      return false;
    }
    return (
      typeof dto.buyQuantity === 'number' &&
      typeof dto.getQuantity === 'number' &&
      dto.buyQuantity > 0 &&
      dto.getQuantity > 0
    );
  }

  /**
   * Validates bundle deal configuration
   */
  private validateBundle(dto: any): boolean {
    if (dto.bundlePrice === undefined || dto.bundlePrice === null) {
      return false;
    }
    const hasValidPrice =
      typeof dto.bundlePrice === 'number' && dto.bundlePrice > 0;
    const hasMinProducts =
      Array.isArray(dto.productIds) && dto.productIds.length >= 2;
    return hasValidPrice && hasMinProducts;
  }

  /**
   * Validates quantity discount configuration
   */
  private validateQuantityDiscount(dto: any): boolean {
    if (
      dto.minQuantity === undefined ||
      dto.minQuantity === null ||
      dto.quantityDiscount === undefined ||
      dto.quantityDiscount === null
    ) {
      return false;
    }
    return (
      typeof dto.minQuantity === 'number' &&
      typeof dto.quantityDiscount === 'number' &&
      dto.minQuantity > 1 &&
      dto.quantityDiscount > 0 &&
      dto.quantityDiscount <= 100
    );
  }

  /**
   * Validates voucher configuration
   */
  private validateVoucher(dto: any): boolean {
    if (dto.voucherValue === undefined || dto.voucherValue === null) {
      return false;
    }
    return typeof dto.voucherValue === 'number' && dto.voucherValue > 0;
  }

  /**
   * Returns appropriate error message based on deal type
   */
  defaultMessage(args: ValidationArguments): string {
    const dto = args.object as any;
    const dealType = dto.dealType;

    switch (dealType) {
      case DealType.PERCENTAGE_DISCOUNT:
        if (dto.percentageOff === undefined || dto.percentageOff === null) {
          return PROMOTION_ERRORS.MISSING_PERCENTAGE;
        }
        return PROMOTION_ERRORS.PERCENTAGE_OUT_OF_RANGE;

      case DealType.FIXED_DISCOUNT:
        if (dto.fixedAmountOff === undefined || dto.fixedAmountOff === null) {
          return PROMOTION_ERRORS.MISSING_FIXED_AMOUNT;
        }
        return PROMOTION_ERRORS.FIXED_AMOUNT_NEGATIVE;

      case DealType.BOGO:
        if (dto.buyQuantity === undefined || dto.buyQuantity === null) {
          return PROMOTION_ERRORS.MISSING_BUY_QUANTITY;
        }
        if (dto.getQuantity === undefined || dto.getQuantity === null) {
          return PROMOTION_ERRORS.MISSING_GET_QUANTITY;
        }
        if (dto.buyQuantity <= 0) {
          return PROMOTION_ERRORS.BUY_QUANTITY_INVALID;
        }
        if (dto.getQuantity <= 0) {
          return PROMOTION_ERRORS.GET_QUANTITY_INVALID;
        }
        return PROMOTION_ERRORS.INVALID_BOGO_CONFIG;

      case DealType.BUNDLE:
        if (dto.bundlePrice === undefined || dto.bundlePrice === null) {
          return PROMOTION_ERRORS.MISSING_BUNDLE_PRICE;
        }
        if (dto.bundlePrice <= 0) {
          return PROMOTION_ERRORS.BUNDLE_PRICE_NEGATIVE;
        }
        if (!Array.isArray(dto.productIds) || dto.productIds.length < 2) {
          return PROMOTION_ERRORS.BUNDLE_INSUFFICIENT_PRODUCTS;
        }
        return PROMOTION_ERRORS.INVALID_BUNDLE_PRICE;

      case DealType.QUANTITY_DISCOUNT:
        if (dto.minQuantity === undefined || dto.minQuantity === null) {
          return PROMOTION_ERRORS.MISSING_MIN_QUANTITY;
        }
        if (
          dto.quantityDiscount === undefined ||
          dto.quantityDiscount === null
        ) {
          return PROMOTION_ERRORS.MISSING_QUANTITY_DISCOUNT;
        }
        if (dto.minQuantity <= 1) {
          return PROMOTION_ERRORS.MIN_QUANTITY_TOO_LOW;
        }
        if (dto.quantityDiscount <= 0 || dto.quantityDiscount > 100) {
          return PROMOTION_ERRORS.QUANTITY_DISCOUNT_OUT_OF_RANGE;
        }
        return PROMOTION_ERRORS.INVALID_QUANTITY_DISCOUNT;

      case DealType.VOUCHER:
        if (dto.voucherValue === undefined || dto.voucherValue === null) {
          return PROMOTION_ERRORS.MISSING_VOUCHER_VALUE;
        }
        if (dto.voucherValue <= 0) {
          return PROMOTION_ERRORS.VOUCHER_VALUE_NEGATIVE;
        }
        return PROMOTION_ERRORS.INVALID_VOUCHER_VALUE;

      default:
        return PROMOTION_ERRORS.INVALID_DEAL_TYPE;
    }
  }
}

/**
 * Decorator for validating deal configurations.
 * Use this on the DTO class to ensure proper deal configuration.
 * 
 * @param validationOptions - Optional validation options
 * @returns Property decorator
 * 
 * @example
 * ```typescript
 * export class CreatePromotionDto {
 *   @IsDealConfigValid()
 *   dealType: DealType;
 *   // ... other fields
 * }
 * ```
 */
export function IsDealConfigValid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isDealConfigValid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsDealConfigValidConstraint,
    });
  };
}

