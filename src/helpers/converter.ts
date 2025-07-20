export class Converter {
  public static convertFahrenheitToCelsius(fahrenheit?: number): number | undefined {
    if (fahrenheit === undefined || fahrenheit === null) {
      return undefined;
    }
    return ((fahrenheit - 32) * 5) / 9;
  }
}
