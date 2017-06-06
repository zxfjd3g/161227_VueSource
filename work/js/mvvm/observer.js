function Observer(data) {
    // 保存data对象
    this.data = data;
    // 开启监视
    this.walk(data);
}

Observer.prototype = {
    walk: function(data) {
        var me = this;
        // 遍历data中所有属性
        Object.keys(data).forEach(function(key) {
            // 劫持指定的属性
            me.convert(key, data[key]);
        });
    },
    convert: function(key, val) {
        this.defineReactive(this.data, key, val);
    },

    /**
     * 对指定属性进行劫持
     * @param data
     * @param key
     * @param val
     */
    defineReactive: function(data, key, val) {
        // 为当前属性创建一个对应的dep对象
        var dep = new Dep();
        // 递归调用observe, 实现所有层次属性的劫持
        var childObj = observe(val);

        // 给data重新定义属性(指定属性描述符)
        Object.defineProperty(data, key, {
            enumerable: true, // 可枚举
            configurable: false, // 不能再define
            get: function() {
                //是否指定了watcher
                if (Dep.target) {
                    // 建立dep与watcher之间的关系
                    dep.depend();
                }
                // 返回value
                return val;
            },
            set: function(newVal) {
                // 如果没有变化就直接结束
                if (newVal === val) {
                    return;
                }
                // 更新为新的值
                val = newVal;
                // 新的值是object的话，进行监听
                childObj = observe(newVal);  // alt + 向左
                // 通知所有订阅者
                dep.notify();
            }
        });
    }
};

function observe(value, vm) {
    // value必须是对象
    if (!value || typeof value !== 'object') {
        return;
    }
    // 创建一个Observer对象
    return new Observer(value);
};


var uid = 0;

function Dep() {
    // 标识id
    this.id = uid++;
    // 相关的所有watcher的数组
    this.subs = [];
}

Dep.prototype = {
    addSub: function(sub) {
        this.subs.push(sub);
    },

    depend: function() {
        // 调用watcher来建立关系
        Dep.target.addDep(this);
    },

    removeSub: function(sub) {
        var index = this.subs.indexOf(sub);
        if (index != -1) {
            this.subs.splice(index, 1);
        }
    },

    notify: function() {
        // 遍历所有相关的watcher, 并通知它们
        this.subs.forEach(function(sub) { //sub是一个watcher
            sub.update();
        });
    }
};

Dep.target = null;