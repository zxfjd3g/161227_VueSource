function Watcher(vm, exp, cb) {
    // 更新界面的回调
    this.cb = cb;
    this.vm = vm;
    // 表达式
    this.exp = exp;
    // 保存相关n个dep的对象: key是dep的id, value是dep
    this.depIds = {};
    // 得到当前表达式的初始值
    this.value = this.get();
}

Watcher.prototype = {
    update: function() {
        this.run();
    },
    run: function() {
        // 获取当前新值
        var value = this.get();
        // old值
        var oldVal = this.value;
        // 如果不等
        if (value !== oldVal) {
            // 更新value
            this.value = value;
            // 调用回调函数, 更新界面
            this.cb.call(this.vm, value, oldVal);
        }
    },
    addDep: function(dep) {
        // 判断是否已经建立关系
        if (!this.depIds.hasOwnProperty(dep.id)) {
            // 将watcher添加到对应的dep中
            dep.addSub(this);
            // 将dep添加到watcher中
            this.depIds[dep.id] = dep;
        }
    },

    get: function() {
        // 给dep指定当前的watcher
        Dep.target = this;
        // 获取值
        var value = this.getVMVal();
        Dep.target = null;
        return value;
    },

    getVMVal: function() {
        // 拆分表达式
        var exp = this.exp.split('.');
        // 获取表达式所对应的值
        var val = this.vm._data;
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    }
};