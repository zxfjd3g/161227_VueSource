function MVVM(options) {
    // 将配置保存到vm对象中
    this.$options = options;
    // 将配置中的data保存到vm对象/data
    var data = this._data = this.$options.data;
    // 缓存vm对象
    var me = this;
    // 数据代理
    // 实现 vm.xxx -> vm._data.xxx
    // 遍历data中所有的属性, 并实现对它的代理
    Object.keys(data).forEach(function(key) { // key是data中一个属性的属性名
        me._proxy(key);
    });

    // 实现对data数据的劫持(绑定)
    observe(data, this);

    // 创建编译对象
    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },

    _proxy: function(key) {
        // 缓存vm
        var me = this;
        // 通过defineProperty()给vm对象添加key属性(属性描述符)
        Object.defineProperty(me, key, {
            configurable: false, // 配置不可修改
            enumerable: true, // 可枚举
            // 当读取vm.xxx时, 会调用此方法从data中得到对应的属性值
            get: function proxyGetter() {
                return me._data[key];
            },
            // 当修改了vm.xxx的值时调用, 修改data中对应的属性的值
            set: function proxySetter(newVal) {
                me._data[key] = newVal;
            }
        });
    }
};