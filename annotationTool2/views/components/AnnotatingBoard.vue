<template>
    <div>
        <Card dis-hover :shadow="false" :padding="6">
            <p>实体标注说明：先用鼠标选择(划取)下面的实体文字，然后点击上面对应的实体名称。双击已经标注的文本可以取消标注。</p>
            <Row>
                <span class="btn" v-if="tags && tags.length == 0">暂无实体标签</span>

                <!-- <Button class="btn" v-for="t in tags" :key="t._id" @click="setTag(t)" :style="{background: colorize(t.color)}">{{t.name}}({{t.symbol}})</Button> -->
                <Divider orientation="left" size="small">慢性期</Divider>
                <Button class="btn" v-for="t in tags.slice(0, 13)" :key="t._id" @click="setTag(t)" :style="{background: colorize(t.color)}">{{t.name}}</Button>
                <Divider orientation="left" size="small">急性期</Divider>
                <Button class="btn" v-for="t in tags.slice(13, 26)" :key="t._id" @click="setTag(t)" :style="{background: colorize(t.color)}">{{t.name}}</Button>
                <Divider orientation="left" size="small">其他</Divider>
                <Button class="btn" v-for="t in tags.slice(26)" :key="t._id" @click="setTag(t)" :style="{background: colorize(t.color)}">{{t.name}}</Button>

                <Divider orientation="left" size="small">操作</Divider>
                <Button class="btn" size="small" type="info" ghost @click="add_tag_modal=true"><Icon type="md-add" />添加或修改实体标签</Button>
                <Button class="btn" size="small" type="info" ghost @click="del_tag_modal=true"><Icon type="md-close" />删除实体标签</Button>
                <Button class="btn" size="small" type="info" ghost @click="reorder_tag_modal=true"><Icon type="ios-analytics-outline" />调整顺序</Button>
            </Row>
        </Card>
        <Card dis-hover :shadow="false" :padding="6">
            <p>关系标注说明：请先选择需要标注的关系标签，然后依次点选“实体1”和“实体2”，然后选择(划取)支持文本。</p>
            <Row>
                <span class="btn" v-if="relation_tags && relation_tags.length == 0">暂无关系标签</span>
                <Button class="btn" v-for="r in relation_tags" :key="r" @click="setRelation(r)">{{r}}</Button>
                <Button class="btn" size="small" type="info" ghost @click="add_relation_modal=true"><Icon type="md-add" />添加关系标签</Button>
                <Button class="btn" size="small" type="info" ghost @click="del_relation_modal=true"><Icon type="md-close" />删除关系标签</Button>
                <Button class="btn" size="small" type="info" ghost @click="reorder_relation_modal=true"><Icon type="ios-analytics-outline" />调整顺序</Button>
            </Row>
            <Row>
                <List border>
                    <ListItem v-if="relationships.length == 0">暂无关系</ListItem>
                    <ListItem v-for="(r, idx) in relationships" :key="idx">
                        <span class="rbox">{{ r.entity1.text }}</span>
                        <span class="rbox">{{ r.relation }}</span>
                        <span class="rbox">{{ r.entity2.text }}</span>
                        <span class="rbox">{{ r.support_text }}</span>
                        <span>
                            <Button class="btn" size="small" type="info" ghost @click="removeRelationship(idx)"><Icon type="md-close" />删除此关系</Button>
                        </span>
                    </ListItem>
                    <ListItem v-if="relationship_running">
                        <span class="rbox" :class="{rrunning: relationship_running.running === 'entity1', rplaceholder: !relationship_running.entity1 }">
                            {{ relationship_running.entity1 ? relationship_running.entity1.text : '实体1' }}
                        </span>
                        <span class="rbox">
                            {{ relationship_running.relation }}
                        </span>
                        <span class="rbox" :class="{rrunning: relationship_running.running === 'entity2', rplaceholder: !relationship_running.entity2 }">
                            {{ relationship_running.entity2 ? relationship_running.entity2.text : '实体2' }}
                        </span>
                        <span class="rbox" :class="{rrunning: relationship_running.running === 'support_text', rplaceholder: !relationship_running.support_text}">
                            {{ relationship_running.support_text ? relationship_running.support_text : '关系支持文本' }}
                        </span>
                        <span v-if="relationship_running.running === 'support_text'">
                            <a href="#" @click.prevent="addRelation()">
                                添加无支持文本的实体关系
                            </a>
                            |
                        </span>
                        <span>
                            <a href="#" @click.prevent="relationship_running = null">取消当前标注</a>
                        </span>
                    </ListItem>
                </List>
            </Row>
            <Row v-if="relationship_running"> <!-- 提示文本 -->
                当前正在进行的操作：
                <span v-if="relationship_running.running === 'entity1'">
                    请点选实体1
                </span>
                <span v-else-if="relationship_running.running === 'entity2'">
                    请点选实体2
                </span>
                <span v-else-if="relationship_running.running === 'support_text'">
                    请勾选支持此关系的文本。也可添加无支持文本的实体关系
                </span>
                <span v-else>
                    未知操作
                </span>
            </Row>
        </Card>
        <br/>
        <Row class="board">
            <p>
                <span ref="items" v-for="(t, idx) in otags" :data="idx" :key="t.start+'~'+t.end" v-on:click="click(idx)" v-on:mouseup="mouseup()" v-on:dblclick="dbclick(idx)" :style="{background: findColor(t.symbol)}">{{text.slice(t.start, t.end)}}</span>
            </p>
        </Row>
        <Row style="margin-top: 5px">
            <Button @click="show_confirm_modal = true">提交标注结果</Button>
        </Row>

        <!-- -->
        <Modal
            v-model="add_tag_modal"
            title="添加实体标签"
            :footer-hide="true">
            <p>注：如果”实体符号“和已经存在的实体标签的符号相同，那么会修改已经存在的标签名称和颜色，否则则会添加实体标签。</p>
            <Form ref="tagForm" :model="tag_form" :rules="tag_rules" :label-width="80">
                <FormItem prop="color" label="颜色">
                    <!-- <Input type="color" v-model="tag_form.color"/> -->
                    <ColorPicker v-model="tag_form.color" alpha />
                </FormItem>
                <FormItem prop="name" label="实体名称">
                    <Input type="text" v-model="tag_form.name" placeholder="比如：时间"/>
                </FormItem>
                <FormItem prop="symbol" label="实体符号">
                    <Input type="text" v-model="tag_form.symbol" placeholder="比如：MI"/>
                </FormItem>
                <FormItem>
                    <Button type="primary" @click="handleTagSubmit('tagForm')">添加</Button>
                </FormItem>
            </Form>
        </Modal>
        <!-- -->
        <Modal
            v-model="del_tag_modal"
            title="删除实体标签"
            :footer-hide="true">
            <p>点击下面的按钮选择需要被删除的实体标签</p>
            <Button class="btn" v-for="t in tags" :key="t._id" @click="removeTag(t)">{{t.name}}</Button>
        </Modal>
        <!-- -->
        <Modal
            v-model="reorder_tag_modal"
            title="重新排列实体标签"
            :footer-hide="true">
            <List border>
                <ListItem v-for="(t, idx) in tags" :key="t._id">
                    <Button type="warning" size="small" class="marginh" @click="tagUp(idx)" :disabled="idx == 0" ><Icon type="md-arrow-round-up" /></Button>
                    <Button type="warning" size="small" class="marginh" @click="tagDown(idx)" :disabled="idx == tags.length - 1" ><Icon type="md-arrow-round-down" /></Button>
                    {{t.name}}
                </ListItem>
            </List>
        </Modal>

        <!-- -->
        <Modal
            v-model="add_relation_modal"
            title="添加关系标签"
            :footer-hide="true">
            <Form ref="relationForm" :model="relation_form" :rules="relation_rules" :label-width="80">
                <FormItem prop="name" label="关系名称">
                    <Input type="text" v-model="relation_form.name" placeholder="比如：有效"/>
                </FormItem>
                <FormItem>
                    <Button type="primary" @click="handleRelationSubmit('relationForm')">添加</Button>
                </FormItem>
            </Form>
        </Modal>
        <!-- -->
        <Modal
            v-model="del_relation_modal"
            title="删除关系标签"
            :footer-hide="true">
            <p>点击下面的按钮选择需要被删除的关系标签</p>
            <Button class="btn" v-for="r in relation_tags" :key="r" @click="removeRelationTag(r)">{{r}}</Button>
        </Modal>
        <!-- -->
        <Modal
            v-model="reorder_relation_modal"
            title="重新排列关系标签"
            :footer-hide="true">
            <List border>
                <ListItem v-for="(r, idx) in relation_tags" :key="r">
                    <Button type="warning" size="small" class="marginh" @click="relationTagUp(idx)" :disabled="idx == 0" ><Icon type="md-arrow-round-up" /></Button>
                    <Button type="warning" size="small" class="marginh" @click="relationTagDown(idx)" :disabled="idx == relation_tags.length - 1" ><Icon type="md-arrow-round-down" /></Button>
                    {{r}}
                </ListItem>
            </List>
        </Modal>

        <!-- -->
        <Modal
            v-model="show_confirm_modal"
            title="确认标注"
            @on-ok="handleSubmit"
            ok-text="提交标注"
            cancel-text="取消"
            :width="60">
            <Divider size="small">实体标注：</Divider>
            <Row v-for="t in tags" :key="t._id">
                <Button class="btn" :style="{background: colorize(t.color)}">{{t.name}}({{t.symbol}})</Button>
                <span v-if="otags.filter(ot => ot.symbol == t.symbol).length == 0">
                    : 无
                </span>
                <span v-else>
                    :
                    <span v-for="(ot, idx) in otags.filter(ot => ot.symbol == t.symbol)" :key="ot.start">
                        {{ idx == 0 ? text.slice(ot.start, ot.end) : ' | ' + text.slice(ot.start, ot.end) }}
                    </span>
                </span>
            </Row>
            <Divider size="small">关系标注：</Divider>
            <table class="table">
                <thead>
                    <tr>
                        <th>实体1</th>
                        <th>关系</th>
                        <th>实体2</th>
                        <th>支持文本</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="relationships.length == 0">
                        <td colspan="4">
                            无关系标注
                        </td>
                    </tr>
                    <tr v-for="(r, idx) in relationships" :key="idx">
                        <td>{{ r.entity1.text }}</td>
                        <td>{{ r.relation }}</td>
                        <td>{{ r.entity2.text }}</td>
                        <td>{{ r.support_text }}</td>
                    </tr>
                </tbody>
            </table>
        </Modal>
    </div>
</template>

<script>
import _ from 'lodash';
// import color from 'color';

// emit: addtag({color, name, symbol})， edittag({color, name, symbol}), deltag(symbol), reordertag(symbols)
// emit: setrelationtags(names)
// submit({otags, orelationships}) // [{length, symbol}]
export default {
    name: 'AnnotatingBoard',
    props: {
        tags: Array,
        relation_tags: Array,
        text: String,
        intags: Array // {length, symbol}
    },
    data () {
        return {
            otags: [], // {start, end, symbol}

            add_tag_modal: false,
            del_tag_modal: false,
            reorder_tag_modal: false,
            tag_form: {
                color: '#fff'
            },
            tag_rules: {
                color: {
                    required: true,
                    trigger: 'blur'
                },
                name: {
                    required: true,
                    message: '实体名称必填',
                    trigger: 'blur'
                },
                symbol: {
                    required: true,
                    message: '实体符号必填',
                    trigger: 'blur'
                }
            },

            add_relation_modal: false,
            del_relation_modal: false,
            reorder_relation_modal: false,
            relation_form: {
                name: ''
            },
            relation_rules: {
                name: {
                    required: true,
                    message: '关系名称必填',
                    trigger: 'blur'
                }
            },
            relationships: [],
            relationship_running: null, // {running: string, entity1, relation, entity2, support}

            show_confirm_modal: false
        };
    },
    created () {
        this.clearAll();
        this.init();
    },
    watch: {
        tags () {
            this.init();
        },
        text () {
            this.clearAll();
            this.init();
        },
        intags () {
            this.init();
        }
    },
    methods: {
        colorize (c) {
            // return color(c).alpha(0.7).string();
            return c;
        },
        findColor (symbol) {
            let tag = _.find(this.tags, t => t.symbol === symbol);
            if (tag) return tag.color;
            return '#fff';
        },
        handleTagSubmit (name) {
            this.$refs[name].validate((valid) => {
                if (valid) {
                    let otag = _.find(this.tags, i => i.symbol === this.tag_form.symbol);
                    // if (otag) {
                    //     this.$Message.error(`与'${otag.name}'实体标签具有相同的符号`);
                    //     return;
                    // }
                    this.$emit(otag ? 'edittag' : 'addtag', {color: this.tag_form.color, name: this.tag_form.name, symbol: this.tag_form.symbol});
                    this.add_tag_modal = false;
                }
            });
        },
        removeTag (tag) {
            this.$Modal.confirm({
                title: '确认实体标签',
                content: `是否删除'${tag.name}'实体标签？`,
                onOk: () => {
                    this.$emit('deltag', tag.symbol);
                }
            });
        },
        tagUp (idx) {
            let a = this.tags[idx];
            let b = this.tags[idx - 1];
            this.$set(this.tags, idx, b);
            this.$set(this.tags, idx - 1, a);
            this.$emit('reordertag', this.tags.map(t => t.symbol));
        },
        tagDown (idx) {
            let a = this.tags[idx];
            let b = this.tags[idx + 1];
            this.$set(this.tags, idx, b);
            this.$set(this.tags, idx + 1, a);
            this.$emit('reordertag', this.tags.map(t => t.symbol));
        },
        handleRelationSubmit (name) {
            this.$refs[name].validate((valid) => {
                if (valid) {
                    let re = _.find(this.relations, r => r === this.relation_form.name);
                    if (re) {
                        this.$Message.error(`与'${re}'关系标签相同`);
                        return;
                    }
                    let relation_tags = _.clone(this.relation_tags);
                    relation_tags.push(this.relation_form.name);
                    this.$emit('setrelationtags', relation_tags);
                    this.add_relation_modal = false;
                }
            });
        },
        removeRelationTag (name) {
            this.$Modal.confirm({
                title: '确认关系标签',
                content: `是否删除'${name}'关系标签？`,
                onOk: () => {
                    let relation_tags = this.relation_tags.filter(r => r !== name);
                    this.$emit('setrelationtags', relation_tags);
                }
            });
        },
        relationTagUp (idx) {
            let a = this.relation_tags[idx];
            let b = this.relation_tags[idx - 1];
            this.$set(this.relation_tags, idx, b);
            this.$set(this.relation_tags, idx - 1, a);
            this.$emit('setrelationtags', this.relation_tags);
        },
        relationTagDown (idx) {
            let a = this.relation_tags[idx];
            let b = this.relation_tags[idx + 1];
            this.$set(this.relation_tags, idx, b);
            this.$set(this.relation_tags, idx + 1, a);
            this.$emit('setrelationtags', this.relation_tags);
        },
        // 将相邻的符号相同的段进行合并
        mergeTags (otags) {
            otags = otags.filter(t => t.start < t.end); // 去掉长度为0的
            let merged_otags = [];
            for (let i = 0; i < otags.length; i++) {
                if (merged_otags.length === 0) {
                    merged_otags.push(otags[i]);
                } else {
                    if (merged_otags[merged_otags.length - 1].symbol === otags[i].symbol) {
                        if (merged_otags[merged_otags.length - 1].end !== otags[i].start) {
                            this.$Message.error('出现错误：合并出错，请联系管理员进行处理。');
                            throw new Error('出现错误：合并出错，请联系管理员进行处理。');
                        }
                        merged_otags[merged_otags.length - 1].end = otags[i].end;
                    } else {
                        merged_otags.push(otags[i]);
                    }
                }
            }
            return merged_otags;
        },
        clearAll () {
            this.otags = [];

            this.relationships = [];
            this.relationship_running = null;
        },
        init () {
            // =================== otags =========================
            let otags = [];
            let error_flag = false;

            if (!this.tags || !this.text) {
                otags = [];
            } else {
                if (this.otags && this.otags.length > 0) {
                    otags = this.otags;
                } else if (!this.intags) {
                    otags = [{
                        start: 0,
                        end: this.text.length,
                        symbol: 'O'
                    }];
                } else {
                    let sum_length = 0;
                    for (let i = 0; i < this.intags.length; i++) {
                        sum_length += this.intags[i].length;
                    }
                    if (sum_length !== this.text.length) {
                        this.$Message.error(`出现错误：tags长度总和不相同(${this.text.length} vs ${sum_length})，请联系管理员进行处理。`);
                        error_flag = true;
                    }
                    if (!error_flag) {
                        let start = 0;
                        for (let i = 0; i < this.intags.length; i++) {
                            otags.push({
                                start,
                                end: start + this.intags[i].length,
                                symbol: this.intags[i].symbol
                            });
                            start += this.intags[i].length;
                        }
                    }
                }
            }

            // 整理
            for (let i = 0; i < otags.length; i++) {
                if (!_.some(this.tags, t => t.symbol === otags[i].symbol)) {
                    otags[i].symbol = 'O';
                }
            }
            let merged_otags = [];
            try {
                merged_otags = this.mergeTags(otags);
            } catch (e) {
                error_flag = true;
            }

            // check
            for (let i = 0; i < merged_otags.length; i++) {
                if (i > 0 && merged_otags[i].start !== merged_otags[i - 1].end) {
                    error_flag = true;
                    this.$Message.error('出现错误：检查1，请联系管理员进行处理。');
                }
                if (i === 0 && merged_otags[i].start !== 0) {
                    error_flag = true;
                    this.$Message.error('出现错误：检查2，请联系管理员进行处理。');
                }
                if (i === merged_otags.length - 1 && merged_otags[i].end !== this.text.length) {
                    error_flag = true;
                    this.$Message.error('出现错误：检查3，请联系管理员进行处理。');
                }
            }

            if (error_flag) {
                this.otags = [
                    {
                        start: 0,
                        end: this.text.length,
                        symbol: 'O'
                    }
                ];
            } else {
                this.otags = merged_otags;
            }
            // =================== otags =========================
        },
        setTag (tag) {
            if (!window.getSelection) {
                alert('请使用谷歌浏览器火狐浏览器进行操作。');
                return;
            }
            let selectionObj = window.getSelection();
            if (selectionObj.type !== 'Range') {
                alert('请先选择文本。');
                return;
            }
            let rangeObj = selectionObj.getRangeAt(0);
            if (rangeObj.startContainer !== rangeObj.endContainer) {
                alert('选择的文本非法。');
                return;
            }
            let idx = -1;
            for (let i = 0; i < this.$refs['items'].length; i++) {
                if (this.$refs['items'][i] === rangeObj.startContainer.parentNode) {
                    idx = i;
                }
            }
            if (idx < 0) {
                alert('选择的文本非法。');
                return;
            }
            idx = Number(this.$refs['items'][idx].getAttribute('data'));
            console.log(rangeObj);
            console.log('idx', idx);

            let otags = _.clone(this.otags);
            otags = _.concat(
                otags.slice(0, idx),
                {
                    start: otags[idx].start,
                    end: rangeObj.startOffset + otags[idx].start,
                    symbol: otags[idx].symbol
                },
                {
                    start: rangeObj.startOffset + otags[idx].start,
                    end: rangeObj.endOffset + otags[idx].start,
                    symbol: tag.symbol
                },
                {
                    start: rangeObj.endOffset + otags[idx].start,
                    end: otags[idx].end,
                    symbol: otags[idx].symbol
                },
                otags.slice(idx + 1)
            );

            this.otags = this.mergeTags(otags);
        },
        click (idx) {
            if (!this.relationship_running) return;
            if (this.relationship_running.running === 'entity1' || this.relationship_running.running === 'entity2') {
                let otags = _.clone(this.otags);
                let tag = otags[idx];
                if (tag.symbol === 'O') {
                    this.$Message.error('请选择一个实体');
                } else {
                    this.relationship_running[this.relationship_running.running] = {
                        start_pos: tag.start,
                        end_pos: tag.end,
                        text: this.text.slice(tag.start, tag.end)
                    };
                    if (this.relationship_running.running === 'entity1') {
                        this.relationship_running.running = 'entity2';
                    } else {
                        this.relationship_running.running = 'support_text';
                    }
                }
            }
        },
        mouseup () {
            if (!this.relationship_running || this.relationship_running.running !== 'support_text') return;

            if (!window.getSelection) {
                alert('请使用谷歌浏览器火狐浏览器进行操作。');
                return;
            }
            let selectionObj = window.getSelection();
            if (selectionObj.type !== 'Range') {
                alert('请先选择支持关系的文本。');
                return;
            }
            let rangeObj = selectionObj.getRangeAt(0);
            let start_idx = -1;
            let end_idx = -1;
            for (let i = 0; i < this.$refs['items'].length; i++) {
                if (this.$refs['items'][i] === rangeObj.startContainer.parentNode) {
                    start_idx = i;
                }
                if (this.$refs['items'][i] === rangeObj.endContainer.parentNode) {
                    end_idx = i;
                }
            }
            if (start_idx < 0 || end_idx < 0) {
                alert('选择的文本非法。');
                return;
            }
            start_idx = Number(this.$refs['items'][start_idx].getAttribute('data'));
            end_idx = Number(this.$refs['items'][end_idx].getAttribute('data'));

            let otags = _.clone(this.otags);
            let start = rangeObj.startOffset + otags[start_idx].start;
            let end = rangeObj.endOffset + otags[end_idx].start;
            this.relationship_running.support_text = this.text.slice(start, end);
            this.relationships = _.concat(this.relationships, [this.relationship_running]);
            this.relationship_running = null;
            this.$Message.success('添加关系成功');
        },
        addRelation () { // 添加无支持文本的关系
            if (!this.relationship_running) return;
            this.relationships = _.concat(this.relationships, [this.relationship_running]);
            this.relationship_running = null;
            this.$Message.success('添加关系成功');
        },
        removeRelationship (idx) {
            this.relationships.splice(idx, 1);
        },
        dbclick (idx) {
            let otags = _.clone(this.otags);
            otags[idx].symbol = 'O';
            this.otags = this.mergeTags(otags);
        },
        setRelation (re) {
            this.relationship_running = {
                running: 'entity1',
                relation: re
            };
        },
        handleSubmit () {
            let otags = this.otags.map(i => {
                return {
                    length: i.end - i.start,
                    symbol: i.symbol
                };
            });
            this.$emit('submit', {otags, orelationships: _.clone(this.relationships)});
        }
    }
};
</script>

<style scoped>
.board {
    border: 1px solid #c7c7c7;
    border-radius: 2px;
    padding: 5px;
}
.btn {
    margin: 5px;
}
.rbox {
    margin-left: 10px;
    margin-right: 10px;
}
.rplaceholder {
    min-width: 100px;
    text-align: center;
    color: #9c9c9c;
}
.rrunning {
    border: 1px solid red;
    border-radius: 2px;
}
.table {
    width: 100%;
}
table.table, table.table th, table.table td {
    border: 1px solid black;
}
table.table th, table.table td {
    text-align: center;
}
table.table {
    border-collapse: collapse;
}
.marginh {
    margin-right: 10px;
}
</style>
