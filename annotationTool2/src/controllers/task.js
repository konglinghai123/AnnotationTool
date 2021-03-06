require('should');
let Router = require('koa-router');
let assert = require('assert');
let { DatasetItem, Task, TaskItem } = require('../models');
let _ = require('lodash');

const router = module.exports = new Router();

// task_id
router.get('/get_dataset_task', async ctx => {
    let task = await Task.findById(ctx.query.task_id).populate('dataset');
    assert(task, '参数非法');
    ctx.body = {
        success: true,
        data: task.toJSON()
    };
});

// task_id
router.post('/set_dataset_task_machine', async ctx => {
    let task = await Task.findById(ctx.request.body.task_id);
    assert(task, '参数非法');
    task.machine_running = true;
    task.machine_status = '正在等待领取任务';
    await task.save();
    ctx.body = {
        success: true
    };
});

// task_id, name, symbol, color
router.post('/add_dataset_task_tag', async ctx => {
    let task = await Task.findById(ctx.request.body.task_id);
    assert(task, '参数非法');
    let name = ctx.request.body.name;
    let symbol = ctx.request.body.symbol;
    let color = ctx.request.body.color;
    assert(name, '实体必须有名称');
    assert(symbol, '实体必须有标签');
    assert(color, '实体必须有对应的颜色');

    assert(symbol.length > 0 && !/\s/.test(symbol), '标签不能有空白');
    assert(symbol !== 'O', '标签不能是O');
    assert(!_.some(task.tags, t => t.symbol === symbol), '标签已经存在');
    task.tags.push({name, symbol, color});
    task.markModified('tags');
    await task.save();
    ctx.body = {
        success: true
    };
});

// task_id, symbol, name, color
router.post('/modify_dataset_task_tag', async ctx => {
    let task = await Task.findById(ctx.request.body.task_id);
    assert(task, '参数非法');
    let name = ctx.request.body.name;
    let symbol = ctx.request.body.symbol;
    let color = ctx.request.body.color;
    assert(name, '实体必须有名称');
    assert(symbol, '实体必须有标签');
    assert(color, '实体必须有对应的颜色');

    let t = _.find(task.tags, t => t.symbol === symbol);
    t.name = name;
    t.color = color;
    task.markModified('tags');
    await task.save();
    ctx.body = {
        success: true
    };
});

// task_id, symbol
router.post('/delete_dataset_task_tag', async ctx => {
    let task = await Task.findById(ctx.request.body.task_id);
    assert(task, '参数非法');
    let symbol = ctx.request.body.symbol;
    assert(symbol, '参数非法');
    task.tags = task.tags.filter(t => t.symbol !== symbol);
    await task.save();
    ctx.body = {
        success: true
    };
});

// task_id, symbols
router.post('/reorder_dataset_task_tag', async ctx => {
    let task = await Task.findById(ctx.request.body.task_id);
    assert(task, '参数非法');
    let symbols = ctx.request.body.symbols;
    assert(symbols, '参数非法');
    assert(_.isArray(symbols));

    let tags = [];
    for (let sym of symbols) {
        let tag = _.find(task.tags, t => t.symbol === sym);
        assert(tag);
        tags.push(tag);
    }
    task.tags = tags;

    await task.save();
    ctx.body = {
        success: true
    };
});

// task_id, names
router.post('/set_dataset_task_relation_tag', async ctx => {
    let task = await Task.findById(ctx.request.body.task_id);
    assert(task, '参数非法');
    let names = ctx.request.body.names;
    assert(_.isArray(names), '参数非法');
    task.relation_tags = names;
    await task.save();
    ctx.body = {
        success: true
    };
});

// task_id
router.get('/get_next_task_item', async ctx => {
    let task = await Task.findById(ctx.query.task_id).populate('dataset');
    assert(task, '参数非法');

    let item = await TaskItem.findOne({task, by_human: false}).sort('confidence').populate('dataset_item');
    let task_info = null;
    if (item) {
        task_info = {
            dataset_item: item.dataset_item._id,
            content: item.dataset_item.content,
            tags: item.tags,
            confidence: item.confidence,
            by_human: item.by_human
        };
    } else {
        let banned_items = (await TaskItem.find({task}).select('dataset_item')).map(i => i.dataset_item.toString());
        let dataset_item = await DatasetItem.findOne({dataset: task.dataset, _id: {$not: {$in: banned_items}}});
        if (dataset_item) {
            task_info = {
                dataset_item: dataset_item._id,
                content: dataset_item.content,
                tags: [{length: dataset_item.content.length, symbol: 'O'}],
                confidence: 0,
                by_human: false
            };
        }
    }
    ctx.body = {
        success: true,
        data: task_info
    };
});
// task_id, dataset_item_id, tags, relation_tags
router.post('/set_task_item_tags', async ctx => {
    let task = await Task.findById(ctx.request.body.task_id).populate('dataset');
    assert(task, '参数错误');
    let dataset_item = await DatasetItem.findById(ctx.request.body.dataset_item_id).populate('dataset');
    assert(dataset_item, '参数错误');
    assert(task.dataset._id.equals(dataset_item.dataset._id), '参数错误');

    let tags = ctx.request.body.tags;
    assert(_.isArray(tags), '参数错误');
    let sum_length = 0;
    for (let tag of tags) {
        assert(_.isObject(tag), '参数错误');
        assert(_.has(tag, 'length') && _.isNumber(tag.length) && tag.length > 0, '参数错误');
        assert(_.has(tag, 'symbol') && _.isString(tag.symbol) && (tag.symbol === 'O' || _.some(task.tags, i => i.symbol === tag.symbol)), '参数错误');
        assert(_.keys(tag).length === 2, '参数错误');
        sum_length += tag.length;
    }
    assert(sum_length === dataset_item.content.length, '总长度不正确');

    let relation_tags = ctx.request.body.relation_tags || [];
    assert(_.isArray(relation_tags), '参数错误');

    await TaskItem.findOneAndUpdate({task, dataset_item}, {task, dataset_item, tags, relation_tags, by_human: true}, {upsert: true});
    ctx.body = {
        success: true
    };
});
