

export class WheelSelectInput {
    constructor({store, id, onChange, options, formatKey}) {
        this.store = store;
        this.id = id;
        this.onChange = onChange;
        this.options = options;
        this.formatKey = formatKey;

        const element = document.getElementById(this.id);
        element.onwheel = this.onWheel.bind(this);
        this.element = element.getElementsByClassName("value")[0];

        this.store.subscribe(this.id, (before, after) => {
            if (before !== after) {
                this.onKeyChanged(after);
            }
        });
        this.onKeyChanged(this.store[this.id]);
    }

    onWheel(event) {
        let selected;
        if (event.deltaY > 0) {
            selected = Math.max(0, this.selected - 1);
        }
        else {
            selected = Math.min(this.selected + 1, this.options.length - 1);
        }
        this.store[this.id] = this.options[selected].key;
    }

    format() {
        const option = this.options[this.selected];
        this.element.textContent = this.formatKey ? this.formatKey(option.key) : option.key;
    }

    onKeyChanged(key) {
        this.selected = 0;
        for (let i = 0; i < this.options.length; ++i) {
            if (this.options[i].key === key) {
                this.selected = i;
                break;
            }
        }
        this.format();
        const option = this.options[this.selected];
        if (this.onChange) this.onChange(option.key, option.value);
    }
}


export class WheelValueInput {
    constructor({store, id, onChangeByUser, onChange, newValue, formatValue}) {
        this.store = store;
        this.id = id;
        this.onChangeByUser = onChangeByUser;
        this.onChange = onChange;
        this.newValue = newValue;
        this.formatValue = formatValue;

        const element = document.getElementById(id);
        element.onwheel = this.onWheel.bind(this);
        this.element = element.getElementsByClassName("value")[0];

        this.store.subscribe(this.id, (before, after) => {
            if (before !== after) {
                this.onValueChanged();
            }
        });

        this.onValueChanged();
    }

    onWheel(event) {
        this.store[this.id] = this.newValue(this.store[this.id], event.deltaY > 0);
        this.onValueChanged();
        if (this.onChangeByUser) this.onChangeByUser(this.store[this.id]);
    }

    onValueChanged() {
        this.element.textContent = this.formatValue(this.store[this.id]);
        if (this.onChange) this.onChange(this.store[this.id]);
    }
}


