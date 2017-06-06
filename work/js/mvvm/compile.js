
function Compile(el, vm) {
    // 将vm保存到Compile实例对象上
    this.$vm = vm;
    // 将el元素对象保存到Compile实例对象上
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);

    if (this.$el) {
        // 1. 将el元素的子节点剪切到一个fragment对象上, 并保存到Compile实例对象上
        this.$fragment = this.node2Fragment(this.$el);
        //  2. 初始化: 编译fragment中所有子节点(表达式/指令)
        this.init();
        // 3. 将编译完成的fragment添加到页面的el中显示
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {
    node2Fragment: function(el) {
        // 创建空的fragment对象
        var fragment = document.createDocumentFragment(),
            child;
        // 得到el中所有的子节点文本
        var childrenHTML = el.innerHTML
        // 剪掉el中所有的子节点
        el.innerHTML = ''
        // 创建一个内存中的div
        var div = document.createElement('div')
        // 将所有子节点插入div中
        div.innerHTML = childrenHTML
        // 将div中所有的子节点剪切到fragment
        while (child = div.firstChild) {
            fragment.appendChild(child);
        }
        // 返回fragment
        return fragment;
    },

    init: function() {
        this.compileElement(this.$fragment);
    },

    /**
     * 编译指定节点的所有子节点
     * @param el   fragment/element
     */
    compileElement: function(el) {
        // 得到所有子节点
        var childNodes = el.childNodes,
            me = this;

        // 遍历子节点一个一个的编译
        [].slice.call(childNodes).forEach(function(node) {// node是某个子节点
            // 得到节点的文本内容
            var text = node.textContent;
            // 匹配表达式{{}}的正则对象
            var reg = /\{\{(.*)\}\}/;

            // 如果节点是一个元素节点
            if (me.isElementNode(node)) {
                // 编译元素(指令属性)
                me.compile(node);
            // 如果当前节点是表达式文本节点
            } else if (me.isTextNode(node) && reg.test(text)) {
                // 编译当前的文本节点
                me.compileText(node, RegExp.$1); // RegExp.$1是表达式文本
            }
            // 如果当前节点还有子节点
            if (node.childNodes && node.childNodes.length) {
                // 编译其所有子节点(递归调用: 为了能编译所有层次的节点)
                me.compileElement(node);
            }
        });
    },

    compile: function(node) {
        // 得到元素节点的所有属性数组
        var nodeAttrs = node.attributes,
            me = this;
        // 遍历属性
        [].slice.call(nodeAttrs).forEach(function(attr) {
            // 得到属性名(v-on:click)
            var attrName = attr.name;
            // 判断是否是指令属性
            if (me.isDirective(attrName)) {
                // 得到属性值(表达式: test)
                var exp = attr.value;
                // 得到指令名(on:click)
                var dir = attrName.substring(2);
                // 判断是否是事件指令
                if (me.isEventDirective(dir)) {
                    // 处理事件指令(去绑定事件监听)
                    compileUtil.eventHandler(node, me.$vm, exp, dir);
                // 普通指令 text/html/class
                } else {
                    // 得到指令所对应的处理函数处理指令
                    compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
                }
                // 删除指令属性
                node.removeAttribute(attrName);
            }
        });
    },

    compileText: function(node, exp) {
        // 调用编译工具对象编译表达式文本节点
        compileUtil.text(node, this.$vm, exp);
    },

    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },

    isEventDirective: function(dir) {
        return dir.indexOf('on') === 0;
    },

    isElementNode: function(node) {
        return node.nodeType == 1;
    },

    isTextNode: function(node) {
        return node.nodeType == 3;
    }
};

/*
处理指令/表达式的工具对象
 */
var compileUtil = {
    // <v-text> | {{}}
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },

    // <v-html>
    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },

    //v-class
    class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },

    // <v-model>
    model: function(node, vm, exp) {

        this.bind(node, vm, exp, 'model');

        var me = this,
          // 得到当前表达式所对应的值
            val = this._getVMVal(vm, exp);
        // 给input节点绑定input事件监听
        node.addEventListener('input', function(e) { // 回调函数
            // 得到最新的值
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }
            // 将最新的值设置到data中对应的属性
            me._setVMVal(vm, exp, newValue);
            val = newValue;
        });
    },

    /*
    1. 根据表达式名称得到对应的值, 调用updater工具对象更新节点对应的属性
     */
    bind: function(node, vm, exp, dir) {// dir: text/html/class
        // 确定用于更新节点的函数
        var updaterFn = updater[dir + 'Updater'];
        // 调用更新函数更新节点
        updaterFn && updaterFn(node, this._getVMVal(vm, exp));

        // 为当前的表达式创建对应的watcher对象
        new Watcher(vm, exp, function(value, oldValue) { // 用于更新界面的回调函数: 当exp的值发生变化就回调
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理
    eventHandler: function(node, vm, exp, dir) {
        // 得到事件类型(名), 得到对应的回调函数
        var eventType = dir.split(':')[1],
            fn = vm.$options.methods && vm.$options.methods[exp];
        // 如果都存在
        if (eventType && fn) {
            // 绑定事件监听: 绑定回调函数中的this为vm
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },

    /**
     * 得到指定表达式的值
     * @param vm
     * @param exp
     * @returns {*}
     * @private
     */
    _getVMVal: function(vm, exp) {// wife.age
        /*
        val = val['wife']
         val['age']
         */
        var val = vm._data;
        exp = exp.split('.');
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    },

    _setVMVal: function(vm, exp, value) {
        var val = vm._data;
        exp = exp.split('.');
        exp.forEach(function(k, i) {
            // 非最后一个key，更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                val[k] = value;
            }
        });
    }
};

/*
用来更新页面节点的工具对象
    包含了多个用于更新节点的方法
 */
var updater = {  // 'textUpdater'  updater['textUpdater']()
    // 标签体文本
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },

    // 标签体文本(当成html)
    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },

    // 标签的class属性
    classUpdater: function(node, value) {
        var className = node.className;
        var space = className ? ' ' : ''
        node.className = className + space + value;
    },

    // 标签的value属性
    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};