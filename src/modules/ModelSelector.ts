

class ModelSelector {
    constructor() {
        const modelSelector = getElementAndCheck("chatui-select") as HTMLSelectElement;
    for (let i = 0; i < this.config.model_list.length; ++i) {
      const item = this.config.model_list[i];
      const opt = document.createElement("option");
      opt.value = item.local_id;
      opt.innerHTML = item.local_id;
      opt.selected = (i == 0);
      modelSelector.appendChild(opt);
    }
    }

}