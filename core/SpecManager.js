/* copyright © 2015 David Valdman */

define(function(require, exports, module) {
    var Transform = require('./Transform');

    var SpecManager = {};

    SpecManager.merge = function merge(spec, parentSpec, entityData){
        var mergedSpec;

        if (typeof spec == 'number') {

            var transform = parentSpec.transform || Transform.identity;
            var align = parentSpec.align || null;
            var opacity = (parentSpec.opacity !== undefined) ? parentSpec.opacity : 1;

            if (align && (align[0] || align[1])) {
                var nextSizeTransform = parentSpec.nextSizeTransform || transform;
                var alignAdjust = [align[0] * parentSpec.size[0], align[1] * parentSpec.size[1], 0];
                var shift = (nextSizeTransform) ? _vecInContext(alignAdjust, nextSizeTransform) : alignAdjust;
                transform = Transform.thenMove(transform, shift);
            }

            mergedSpec = {
                transform : transform,
                opacity : opacity,
                origin : parentSpec.origin || null,
                size : parentSpec.size || null
            };

            if (entityData) entityData[spec] = mergedSpec;

        } else if (spec instanceof Array){

            var mergedSpec = [];
            for (var i = 0; i < spec.length; i++)
                mergedSpec[i] = SpecManager.merge(spec[i], parentSpec, entityData);

        }
        else if (spec instanceof Object){
            var parentSize = parentSpec.size;
            var parentOpacity = (parentSpec.opacity !== undefined) ? parentSpec.opacity : 1;
            var parentTransform = parentSpec.transform || Transform.identity;

            var origin = spec.origin || null;
            var align = spec.align || null;
            var size = SpecManager.getSize(spec, parentSize);

            var opacity = (spec.opacity !== undefined)
                ? parentOpacity * spec.opacity
                : parentOpacity;

            var transform = (spec.transform)
                ? Transform.multiply(parentTransform, spec.transform)
                : parentTransform;

            var nextSizeTransform = (spec.origin)
                ? parentTransform
                : parentSpec.nextSizeTransform || parentTransform;

            if (spec.margins)
                transform = Transform.moveThen([spec.margins[3] || 0, spec.margins[0], 0], transform);

            if (spec.size)
                nextSizeTransform = parentTransform;

            if (origin && (origin[0] || origin[1])){
                transform = Transform.moveThen([-origin[0] * size[0], -origin[1] * size[1], 0], transform);
                origin = null;
            }

            if (parentSize && align && (align[0] || align[1])) {
                var shift = _vecInContext([align[0] * parentSize[0], align[1] * parentSize[1], 0], nextSizeTransform);
                transform = Transform.thenMove(transform, shift);
                align = null;
            }

            mergedSpec = {
                transform : transform,
                opacity : opacity,
                origin : origin,
                align : align,
                size : size,
                nextSizeTransform : nextSizeTransform
            };

            if (spec.target !== undefined)
                mergedSpec = SpecManager.merge(spec.target, mergedSpec, entityData);

        }
        else spec = null;

        return mergedSpec;
    };

    SpecManager.mergeSimple = function merge(spec, parentSpec){
        if (spec instanceof Object){
            var parentSize = parentSpec.size;
            var parentOpacity = parentSpec.opacity || 1;
            var parentTransform = parentSpec.transform || Transform.identity;

            var origin = spec.origin || null;
            var align = spec.align || null;
            var size = SpecManager.getSize(spec, parentSize);

            var opacity = (spec.opacity !== undefined)
                ? parentOpacity * spec.opacity
                : parentOpacity;

            var transform = (spec.transform)
                ? Transform.multiply(parentTransform, spec.transform)
                : parentTransform;

            var nextSizeTransform = (spec.origin)
                ? parentTransform
                : parentSpec.nextSizeTransform || parentTransform;

            if (spec.margins)
                transform = Transform.moveThen([spec.margins[3] || 0, spec.margins[0], 0], transform);

            if (spec.size)
                nextSizeTransform = parentTransform;

            if (origin && (origin[0] || origin[1])){
                transform = Transform.moveThen([-origin[0] * size[0], -origin[1] * size[1], 0], transform);
                origin = null;
            }

            if (parentSize && align && (align[0] || align[1])) {
                var shift = _vecInContext([align[0] * parentSize[0], align[1] * parentSize[1], 0], nextSizeTransform);
                transform = Transform.thenMove(transform, shift);
                align = null;
            }

            return {
                transform : transform,
                opacity : opacity,
                origin : origin,
                align : align,
                size : size,
                nextSizeTransform : nextSizeTransform
            };
        }
        else return spec;
    };

    SpecManager.flatten = function flatten(spec, entityData){
        var flattenedSpec;

        if (spec instanceof Array){
            flattenedSpec = [];
            for (var i = 0; i < spec.length; i++)
                flattenedSpec[i] = SpecManager.flatten(spec[i], entityData);
        }
        else if (spec instanceof Object && spec.target instanceof Object)
            flattenedSpec = SpecManager.merge(spec.target, spec, entityData);
        else
            flattenedSpec = spec;

        return flattenedSpec;
    };

    SpecManager.walk = function walk(spec, parent, reduce, apply, last){
        if (spec instanceof Array){
            for (var i = 0; i < spec.length; i++)
                SpecManager.walk(spec[i], parent, reduce, apply, last);
        }
        else if (spec instanceof Object){
            if (spec.target === undefined) last = spec;
            else{
                var reduced = reduce(spec.target, spec);
                last = SpecManager.walk(reduced, spec, reduce, apply, reduced);
            }
        }
        else if (typeof spec === 'number')
            last = apply(spec, parent);
        return last;
    };

    SpecManager.reduce = function(spec, parentSpec, entityData){
        return SpecManager.walk(spec, parentSpec, SpecManager.mergeSimple, function(spec, parentSpec){
            var transform = parentSpec.transform || Transform.identity;
            var align = parentSpec.align || null;

            if (align && (align[0] || align[1])) {
                var nextSizeTransform = parentSpec.nextSizeTransform || transform;
                var alignAdjust = [align[0] * parentSpec.size[0], align[1] * parentSpec.size[1], 0];
                var shift = (nextSizeTransform) ? _vecInContext(alignAdjust, nextSizeTransform) : alignAdjust;
                transform = Transform.thenMove(transform, shift);
            }

            entityData[spec] = {
                transform : transform,
                opacity : parentSpec.opacity || 1,
                origin : parentSpec.origin || null,
                size : parentSpec.size || null
            };

            return entityData[spec];
        });
    };

    SpecManager.getSize = function flatten(spec, parentSize){
        //TODO: check if new memory needs to be allocated
        var size = (spec.size)
            ? [spec.size[0], spec.size[1]]
            : [parentSize[0], parentSize[1]];

        if (spec.size) {
            if (spec.size[0] === undefined) size[0] = parentSize[0];
            if (spec.size[1] === undefined) size[1] = parentSize[1];
        }

        if (spec.margins){
            size[0] = parentSize[0] - ((spec.margins[1] || 0) + (spec.margins[3] || 0));
            size[1] = parentSize[1] - (spec.margins[0] + (spec.margins[2] || 0));
        }

        if (spec.proportions) {
            if (spec.proportions[0] !== undefined) size[0] *= spec.proportions[0];
            if (spec.proportions[1] !== undefined) size[1] *= spec.proportions[1];
        }

        return size;
    };

    function _vecInContext(v, m) {
        return [
            v[0] * m[0] + v[1] * m[4] + v[2] * m[8],
            v[0] * m[1] + v[1] * m[5] + v[2] * m[9],
            v[0] * m[2] + v[1] * m[6] + v[2] * m[10]
        ];
    }

    module.exports = SpecManager;
});
