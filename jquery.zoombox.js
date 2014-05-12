/**
*    jQuery Plugin for using css transforms to scale a box to fit a certain height/width
*
*    License:
*    The MIT License (MIT)
*
*    @version 0.1.2
*
*   Copyright (c) 2014 Stephen Katulka
*
*   Permission is hereby granted, free of charge, to any person obtaining a copy
*   of this software and associated documentation files (the "Software"), to deal
*   in the Software without restriction, including without limitation the rights
*   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*   copies of the Software, and to permit persons to whom the Software is
*   furnished to do so, subject to the following conditions:
*
*   The above copyright notice and this permission notice shall be included in
*   all copies or substantial portions of the Software.
*
*   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*   THE SOFTWARE.
**/
(function ($) {
    'use strict';

    $.zoombox = {
        constants: {
            ZB_SCALE_DIM_LONGEST: 0,
            ZB_SCALE_DIM_WIDTH: 1,
            ZB_SCALE_DIM_HEIGHT: 2,
            ZB_SCALE_DIM_SHORTEST: 3
        },
        defaults: {
            dimension: 0,
            boundary: $(window),
            guide: undefined,
            onResize: $.noop,
            onResizeFinish: $.noop
        },
        resizeFinishDelay: 100,
        zooms: {},
        resizeDelayTimer: undefined,
        zoom: function (sel, options) {
            /*
            *    The options available are:
            *       dimension: The dimension to use to constrain the scaling. Values are in the $.zoombox.constants object:
            *           ZB_SCALE_DIM_LONGEST  (0): The default. The content will scale to fit the largest dimension
            *            ZB_SCALE_DIM_WIDTH    (1): The box will scale until the width fits the box perfectly
            *            ZB_SCALE_DIM_HEIGHT   (2): The box will scale until the height fits the box perfectly
            *            ZB_SCALE_DIM_SHORTEST (3): The box will scale to fit the shortest dimension
            *              NOTE: Scaling by anything except the "longest" dimension may clip some content
            *
            *        boundary: A jQuery object marking the boundary element against which to scale.
            *            By default, this is set to $(window). The boundary allows you to scale in such a way that certain
            *            portions of the window are not blocked by the zoomed area, for instance, leaving padding on the
            *            top or left side for a navigation bar, etc.
            *
            *        guide: A jQuery object marking the area to scale. By default, the guide is undefined,
            *            which will cause the guide to be set to the first element being scaled. If another element
            *             is set as the guide, THAT element's size will be used as the scaled element for the
            *            purpose of calculating the scaling ratio. That scaling factor will then be used to
            *            scale the original elements.
            *
            *        onResize: A function which will be run each time the box is resized. Continuous resizing will
            *            make this function fire more than once, as it occurs on each resize event. It has two parameters:
            *            '$zoom'   : the zoombox instance object - this exposes properties of this zoom instance. The properties
            *                        available are:
            *                            config: the configuration options for this instance
            *                            elements: the array of elements which matched this instance's selector
            *                            zoomfactor: the currently calculated scaling factor
            *
            *        onResizeFinish: A function which will be run once after the box is resized. Continuous resizing will
            *            NOT make this function fire more than once, as it occurs ONLY ONCE on a delay after the last resize event.
            *            It has two parameters:
            *            '$zoom'   : the zoombox instance object
            **/
            var $zb = $.zoombox,
                zbid = 'zoombox-id-' + (new Date()).getTime() + '-' + Math.floor(Math.random() * 100),
                $zoom = {config: $.extend($zb.defaults, options), elements: [], zoomfactor: 1},
                $config = $zoom.config;
            $zb.zooms[zbid] = $zoom;

            if (typeof sel === 'Object' && sel.length > 0) {
                return;
            }

            // Extract all selected elements from dom and save them into an array
            $.each(sel, function () {
                var guideOffset = {top: 0, left: 0}, val = $(this);
                $(val).each(function () {
                    var $el = $(this), elOffset = $el.offset();
                    // If there is no guide element, set the guide to the first element
                    if (!$config.guide) {
                        $config.guide = $el;
                        guideOffset = $config.guide.offset();
                        $config.guide.data('opos', $config.guide.position());
                    }
                    $zoom.elements.push($el);

                    //Calculate zoombox origin. This is the original difference between the guide's offset
                    //    and the element's. This can be used later for adjusting positioning if desired (for
                    //    instance, for centering the zoomed boxes on the page as they resize). This is especially
                    //    useful if not all of your zoomed elements are child elements of your boundary box, but need
                    //    to scale consistently.
                    elOffset.left = guideOffset.left - elOffset.left;
                    elOffset.top = guideOffset.top - elOffset.top;
                    $el.data('zoombox-origin', elOffset);

                    //Adding the zbid class is useful for later code to interact with zoom instances. It's much more efficient
                    //    to use $zb.zooms[zbid].elements for iteration since jQuery doesn't have to search for them each time.
                    $el.addClass(zbid);
                });
            });

            function doScale() {
                var hBoundary, wBoundary, hGuide, wGuide, hZoom, wZoom, tOrigin;
                hBoundary = $config.boundary.height();
                wBoundary = $config.boundary.width();

                hGuide = $config.guide.height();
                wGuide = $config.guide.width();

                hZoom = hBoundary / hGuide;
                wZoom = wBoundary / wGuide;

                tOrigin = 'top left';

                $zoom.zoomfactor = (function () {
                    if ($config.dimension === $zb.constants.ZB_SCALE_DIM_WIDTH) {
                        return wZoom;
                    }
                    if ($config.dimension === $zb.constants.ZB_SCALE_DIM_WIDTH) {
                        return hZoom;
                    }
                    if ($config.dimension === $zb.constants.ZB_SCALE_DIM_SHORTEST) {
                        return hZoom < wZoom ? hZoom : wZoom;
                    }
                    return hZoom > wZoom ? hZoom : wZoom;
                }());
                $.each($zoom.elements, function () {
                    try {
                        var el = $(this);
                        el.css({
                            '-o-transform-origin': tOrigin,
                            '-moz-transform-origin': tOrigin,
                            '-webkit-transform-origin': tOrigin,
                            '-ms-transform-origin': tOrigin,
                            'transform-origin': tOrigin,
                            '-o-transform': 'scale(' + $zoom.zoomfactor + ')',
                            '-moz-transform': 'scale(' + $zoom.zoomfactor + ')',
                            '-webkit-transform': 'scale(' + $zoom.zoomfactor + ')',
                            '-ms-transform': 'scale(' + $zoom.zoomfactor + ')',
                            'transform': 'scale(' + $zoom.zoomfactor + ')'
                        });
                    } catch (e) {
                        console.log(e);
                    }
                });
            }

            $([document, window]).on('ready resize', function () {
                doScale();
                $config.onResize($zoom);
            });
            $(document).on('resizeFinish', function () {
                doScale();
                $config.onResizeFinish($zoom);
            });
            return $zb.zooms[zbid];
        }
    };

    $([document, window]).on('ready resize', function () {
        var $zb = $.zoombox;
        clearTimeout($zb.resizeDelayTimer);

        $zb.resizeDelayTimer = setTimeout(function () {
            $(document).trigger('resizeFinish');
        }, $zb.resizeFinishDelay);
    });

}(jQuery));