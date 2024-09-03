import { PluginConfigSchemaObject } from '@ecoflow/homebridge-ui/public/interfaces/homebridge';
import { CommonRenderer } from '@ecoflow/homebridge-ui/public/renderers/commonRenderer';
import $ from 'jquery';

describe('CommonRenderer', () => {
  let renderer: CommonRenderer;
  let onChangeCallbackMock: jest.Mock;
  let $parent: JQuery<HTMLElement>;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).$ = $;
  });

  afterAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).$ = undefined;
  });

  describe('renderTextBox', () => {
    beforeEach(() => {
      onChangeCallbackMock = jest.fn();
      $parent = $('<div></div>');
      renderer = new CommonRenderer();
    });

    it('should render a text box when schema contains required attribute set to true', () => {
      const schemaProperty: PluginConfigSchemaObject = {
        title: 'Device Name',
        description: 'Enter the device name',
        required: true,
      };

      renderer.renderTextBox($parent, '1', schemaProperty, 'name1', onChangeCallbackMock);

      expect($parent[0]).toMatchSnapshot();
    });

    it('should render a text box without required attribute when schema does not contain required attribute', () => {
      const schemaProperty: PluginConfigSchemaObject = {
        title: 'Device Name',
        description: 'Enter the device name',
      };

      renderer.renderTextBox($parent, '1', schemaProperty, 'name1', onChangeCallbackMock);

      expect($parent[0]).toMatchSnapshot();
    });

    it('should set value of textbox when rendering', () => {
      const schemaProperty: PluginConfigSchemaObject = {
        title: 'Device Name',
        description: 'Enter the device name',
      };

      renderer.renderTextBox($parent, '1', schemaProperty, 'name1', onChangeCallbackMock);
      const $control = $parent.find('#device1');
      const actual = $control.val();

      expect(actual).toBe('name1');
    });

    it('should call onChangeCallback with the new value when the textbox value changes', () => {
      const schemaProperty: PluginConfigSchemaObject = {
        title: 'Device Name',
        description: 'Enter the device name',
      };

      renderer.renderTextBox($parent, '1', schemaProperty, 'name1', onChangeCallbackMock);
      const $control = $parent.find('#device1');
      const newValue = 'name2';
      $control.val(newValue).trigger('change');

      expect(onChangeCallbackMock).toHaveBeenCalledWith(newValue);
    });
  });
});
