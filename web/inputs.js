

export class WheelSelectStore {
    constructor({store, id, onChange, options}) {
        this.store = store;
        this.id = id;
        this.onChange = onChange;
        this.options = options;

        console.info(id, options);

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
        this.element.textContent = option.key;
        if (this.onChange) this.onChange(option.key, option.value);
    }
}
