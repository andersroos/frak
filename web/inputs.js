

export class WheelSelectStore {
    constructor({store, id, onChange, options, formatKey}) {
        this.store = store;
        this.id = id;
        this.onChange = onChange;
        this.options = options;
        this.formatKey = formatKey;

        const element = document.getElementById(this.id);
        element.onwheel = this.onWheel.bind(this);
        this.element = element.getElementsByClassName("value")[0];

        this.store.subscribe((key, before, after) => {
            if (key === this.id && before !== after) {
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

    onKeyChanged(key) {
        this.selected = 0;
        for (let i = 0; i < this.options.length; ++i) {
            if (this.options[i].key === key) {
                this.selected = i;
                break;
            }
        }
        const option = this.options[this.selected];
        console.info(this.id, "onKeyChanged", key, option);
        this.element.textContent = this.formatKey ? this.formatKey(option.key) : option.key;
        if (this.onChange) this.onChange(option.key, option.value);
    }
}


export class WheelValueStore {
    constructor({store, id, onChangeByUser, newValue, formatValue}) {
        this.store = store;
        this.id = id;
        this.onChangeByUser = onChangeByUser;
        this.newValue = newValue;
        this.formatValue = formatValue;

        const element = document.getElementById(id);
        element.onwheel = this.onWheel.bind(this);
        this.element = element.getElementsByClassName("value")[0];

        this.store.subscribe((key, before, after) => {
            if (key === this.id && before !== after) {
                this.onValueChanged();
            }
        });

        this.onValueChanged();
    }

    onWheel(event) {
        this.store[this.id] = this.newValue(this.store[this.id], event.deltaY > 0);
        this.onValueChanged();
        if (this.onChangeByUser) this.onChangeByUser(this.value);
    }

    onValueChanged() {
        this.element.textContent = this.formatValue(this.store[this.id]);
    }
}


