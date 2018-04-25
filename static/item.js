function Item(elem, type) {
	this.elem = elem;
}
Item.prototype.constructor = Item;

function Button(elem, action) {
	Item.call(this, elem);
	this.action = action;
	this.elem.addEventListener("click", this.action);
}
Button.prototype = Object.create(Item.prototype);
Button.prototype.constructor = Button;

function ButtonExt(elem, actions) {
	Item.call(this, elem);

	this.actions = actions;
	map_dict(this.actions, function (k, v) {
		this.elem.addEventListener(k, v);
	}.bind(this));
}
ButtonExt.prototype = Object.create(Item.prototype);
ButtonExt.prototype.constructor = ButtonExt;

function ToggleButton(elem, action) {
	Button.call(this, elem, action);
	this._value = false;
	this.elem.removeEventListener("click", this.action);
	this.elem.addEventListener("click", function(event){
		this._value = !this._value;
		this.action(event);
	}.bind(this));
}
ToggleButton.prototype = Object.create(Button.prototype);
ToggleButton.prototype.constructor = ToggleButton;
ToggleButton.prototype.getValue = function () {
	return this._value;
};
ToggleButton.prototype.setValue = function (v) {
	this._value = v;
	this.action();
};

function Label(elem, update) {
	Item.call(this, elem);
	this.update = update;
}
Label.prototype = Object.create(Item.prototype);
Label.prototype.constructor = Label;

Label.prototype.setValue = function (v) {
	if (this.update) {
		this.update(v);
	} else {
		this.elem.innerText = v;
	}
}

function Input(elem, update, type) {
	Item.call(this, elem);
	this._value = "";
	this.type = type ? type : "str";
	this.update = update;
	this.elem.addEventListener("change", function (event) {
		this._value = cast(this.type, this.elem.value);
		this.update(event);
	}.bind(this));
}
Input.prototype = Object.create(Item.prototype);
Input.prototype.constructor = Input;

Input.prototype.getValue = function () {
	return this._value;
}
Input.prototype.setValue = function (v) {
	this._value = cast(this.type, v);
	this.elem.value = this._value;
}
