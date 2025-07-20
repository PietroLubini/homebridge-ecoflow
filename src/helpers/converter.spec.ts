import { Converter } from './converter';

describe('Converter', () => {
  describe('convertFahrenheitToCelsius', () => {
    it('should convert 32°F to 0°C', () => {
      const actual = Converter.convertFahrenheitToCelsius(32);
      expect(actual).toBe(0);
    });

    it('should convert 212°F to 100°C', () => {
      const actual = Converter.convertFahrenheitToCelsius(212);
      expect(actual).toBe(100);
    });

    it('should convert 98.6°F to 37°C', () => {
      const actual = Converter.convertFahrenheitToCelsius(98.6);
      expect(actual).toBeCloseTo(37, 1);
    });

    it('should convert 0°F to approximately -17.78°C', () => {
      const actual = Converter.convertFahrenheitToCelsius(0);
      expect(actual).toBeCloseTo(-17.7778, 4);
    });

    it('should return undefined if input is undefined', () => {
      const actual = Converter.convertFahrenheitToCelsius(undefined);
      expect(actual).toBeUndefined();
    });

    it('should return undefined if input is null', () => {
      const actual = Converter.convertFahrenheitToCelsius(null as unknown as undefined);
      expect(actual).toBeUndefined();
    });

    it('should handle negative Fahrenheit values', () => {
      const actual = Converter.convertFahrenheitToCelsius(-40);
      expect(actual).toBe(-40);
    });
  });
});
