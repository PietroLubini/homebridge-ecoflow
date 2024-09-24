import { PluginConfigSchemaEnum, PluginConfigSchemaObject } from '@ecoflow/homebridge-ui/public/interfaces/homebridge';
import { ComponentRenderer } from '@ecoflow/homebridge-ui/public/renderers/componentRenderer';
import $ from 'jquery';

describe('ComponentRenderer', () => {
  let renderer: ComponentRenderer;
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

  beforeEach(() => {
    onChangeCallbackMock = jest.fn();
    $parent = $('<div></div>');
    renderer = new ComponentRenderer();
  });

  describe('renderTextBox', () => {
    let schemaProperty: PluginConfigSchemaObject;

    beforeEach(() => {
      schemaProperty = {
        title: 'Device Name',
        description: 'Enter the device name',
      };
    });

    it('should render a textbox with required attribute when schema contains required attribute set to true', () => {
      schemaProperty.required = true;

      renderer.renderTextBox($parent, '1', schemaProperty, 'name1', onChangeCallbackMock);

      expect($parent[0]).toMatchSnapshot();
    });

    it('should render a textbox without required attribute when schema does not contain required attribute', () => {
      renderer.renderTextBox($parent, '1', schemaProperty, 'name1', onChangeCallbackMock);

      expect($parent[0]).toMatchSnapshot();
    });

    it('should render a textbox with placeholder attribute when schema does not contain description attribute', () => {
      schemaProperty = { title: 'Device Name' };

      renderer.renderTextBox($parent, '1', schemaProperty, 'name1', onChangeCallbackMock);
      const $control = $parent.find('#device1');
      const actual = $control.attr('placeholder');

      expect(actual).toBe('');
    });

    it('should set value of textbox when rendering', () => {
      renderer.renderTextBox($parent, '1', schemaProperty, 'name1', onChangeCallbackMock);
      const $control = $parent.find('#device1');
      const actual = $control.val();

      expect(actual).toBe('name1');
    });

    it('should call onChangeCallback with the new value when the textbox value changes', () => {
      renderer.renderTextBox($parent, '1', schemaProperty, 'name1', onChangeCallbackMock);
      const $control = $parent.find('#device1');
      const newValue = 'name2';
      $control.val(newValue).trigger('change');

      expect(onChangeCallbackMock).toHaveBeenCalledWith(newValue);
    });

    it('should call onChangeCallback with the new undefined value when the textbox value changes to undefined', () => {
      renderer.renderTextBox($parent, '1', schemaProperty, 'name1', onChangeCallbackMock);
      const $control = $parent.find('#device1');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $control.val(undefined as any).trigger('change');

      expect(onChangeCallbackMock).toHaveBeenCalledWith('');
    });
  });

  describe('renderDropDown', () => {
    let schemaProperty: PluginConfigSchemaEnum;

    beforeEach(() => {
      schemaProperty = {
        title: 'Device Name',
        description: 'Enter the device name',
        enum: ['option1', 'option2'],
      };
    });

    it('should render a dropdown with required attribute when schema contains required attribute set to true', () => {
      schemaProperty.required = true;

      renderer.renderDropDown($parent, '1', schemaProperty, 'option2', onChangeCallbackMock);

      expect($parent[0]).toMatchSnapshot();
    });

    it('should render a dropdown without required attribute when schema does not contain required attribute', () => {
      renderer.renderDropDown($parent, '1', schemaProperty, 'option2', onChangeCallbackMock);

      expect($parent[0]).toMatchSnapshot();
    });

    it('should set value of dropdown when rendering', () => {
      renderer.renderDropDown($parent, '1', schemaProperty, 'option2', onChangeCallbackMock);
      const $control = $parent.find('#device1');
      const actual = $control.val();

      expect(actual).toBe('option2');
    });

    it('should call onChangeCallback with the new value when the dropdown value changes', () => {
      renderer.renderDropDown($parent, '1', schemaProperty, 'option2', onChangeCallbackMock);
      const $control = $parent.find('#device1');
      const newValue = 'option1';
      $control.val(newValue).trigger('change');

      expect(onChangeCallbackMock).toHaveBeenCalledWith(newValue);
    });

    it('should call onChangeCallback with the new undefined value when the dropdown value changes to undefined', () => {
      renderer.renderDropDown($parent, '1', schemaProperty, 'option2', onChangeCallbackMock);
      const $control = $parent.find('#device1');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $control.val(undefined as any).trigger('change');

      expect(onChangeCallbackMock).toHaveBeenCalledWith('');
    });
  });
});
