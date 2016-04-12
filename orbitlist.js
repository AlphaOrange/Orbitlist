// jQuery extension: reverse jQuery element order
jQuery.fn.reverse = [].reverse;


// Default values for inner and outer radius limits (between 0 and 1)
var defaultInner = 0;       // Inner limit for radius
var defaultOuter = 1;       // Outer limit for radius
var defaultBorders = 1;     // Factor for space between limit
                            // and inner/outer orbit

// Default value for starting degree
var defaultBegin = 0;

// TODO: not yet implemented: Min density of satellites
var minDensity = 8;
var minDensityLevel1 = 4;   // Min density for 1st orbit,
                            // orbitlist becomes asymetric if less satellites


// Trace satellite back to root
function $orbitlistJS_trace(satellite) {
    while (satellite.length) {
        satellite.addClass('orbitlistJS-trace');
        satellite = satellite.data('parent');
    }
}


// Flatten Orbitlist HTML to one level only
function $orbitlistJS_flatten(core) {

    // Detect height of orbitlist core in document
    var coreHeight = core.parents().length;

    // Height of heighest orbit
    var orbitHeight;

    // All satellites: save parent element, then move li element up to first level
    core.find('li').reverse().each(function () {

        var satellite = $(this);

        // Analyse height and apply corresponding css class
        var height = (satellite.parents().length - coreHeight + 1) / 2;
        satellite.addClass('orbitlistJS-orbit-' + height);
        satellite.data('height', height);
        orbitHeight = Math.max(orbitHeight, height);

        // Save reference for parent element if there is any
        satellite.data('parent', satellite.parent().parent().filter(".orbit li"));
        core.prepend(satellite);

    });

    // Save core height and max orbit height in core
    core.data('coreHeight', coreHeight);
    core.data('orbitHeight', orbitHeight);

    // Initial visible height is 1 (children of core)
    core.data('visibleHeight', 1);

    // Delete all sublists (now empty)
    core.find('ul').remove();

}

function $orbitlistJS_update(core) {

    var density;    // Density of satellites shown
    var angle;      // Starting angle of orbit

    // Height/width of element surrounding the orbitlist
    var frameW = core.parent().width();
    var frameH = core.parent().height();
    var radius = Math.min(frameW, frameH) / 2;
    var offsetTop = frameH / 2 - radius;
    var offsetLeft = frameW / 2 - radius;

    // Data for first/lowest orbit
    var orbitHeight = 1;
    var orbit = core.find('.orbitlistJS-orbit-1');

    // Read orbitlist's properties
    var borders = core.data('orbitlistjs-borders');
    var inner = core.data('orbitlistjs-inner');
    var outer = core.data('orbitlistjs-outer');
    var arcBegin = core.data('orbitlistjs-begin');
    var arcEnd = core.data('orbitlistjs-end');
    var visibleHeight = core.data('visibleHeight');

    // Calculate length of arc (between 0 and 1 = full circle)
    if (arcEnd <= arcBegin) { arcEnd = arcBegin + 360; }
    var arcLen = (arcEnd - arcBegin) / 360;

    // Format all visible orbits
    do {

        // Detect density and angle of orbit
        if (orbitHeight === 1) {
            density = orbit.length;
            angle = 0;
        } else {
            var squeeze = 3;    // TODO: Change to user-definable parameter
            // Density at least as high as orbit below (looks ugly otherwise)
            density = Math.max((orbit.length - 1) * squeeze, density);
            angle = orbit.first().data('parent').data('angle') - 1 / (density / (orbit.length - 1)) / 2;
        }

        // Format all satellites
        orbit.each(function (index) {

            // set satellite jquery element
            var satellite = $(this);

            // Calculate distance from core (between 0 and 1)
            var distance = (visibleHeight === 1 ? 0.5 : (borders + orbitHeight - 1) / (2 * borders + visibleHeight - 1));
            distance = inner + distance * (outer - inner);

            // Calculate satellite position
            var radiant = (index / density + angle + arcBegin) * arcLen * Math.PI * 2;
            var vertical = -Math.cos(radiant);
            var horizontal = Math.sin(radiant);

            // Positions without offset (circle center = 0|0)
            var posTop = radius * distance * vertical;
            var posLeft = radius * distance * horizontal;
            
            // Correct positions by parent element, centering and satellite dimensions
            posTop = posTop + (radius + offsetTop) + core.parent().offset().top - satellite.height() / 2;
            posLeft = posLeft + (radius + offsetLeft) + core.parent().offset().left - satellite.width() / 2;
            
            // Position satellite
            satellite.offset({top: posTop, left: posLeft});

            // Save angle for child orbit
            satellite.data('angle', index / density + angle);

        });

        // Get one orbit higher
        orbitHeight++;
        orbit = core.find('.orbitlistJS-orbit-' + orbitHeight + ':visible');

    } while (orbit.length);

}


// Document ready setup
$(function () {

    // Transform each .orbit class into orbitlist
    $('ul.orbit').each(function (index) {

        // Create orbitlist's core
        var core = $(this);

        // Apply CSS class
        core.addClass('orbitlistJS');

        // Determine orbitlist's properties
        if (core.data('orbitlistjs-inner') === undefined) {
            core.data('orbitlistjs-inner', defaultInner);
        }
        if (core.data('orbitlistjs-outer') === undefined) {
            core.data('orbitlistjs-outer', defaultOuter);
        }
        if (core.data('orbitlistjs-borders') === undefined) {
            core.data('orbitlistjs-borders', defaultBorders);
        }
        if (core.data('orbitlistjs-begin') === undefined) {
            core.data('orbitlistjs-begin', defaultBegin);
        }
        if (core.data('orbitlistjs-end') === undefined) {
            core.data('orbitlistjs-end', core.data('orbitlistjs-begin'));
        }

        // Reduce HTML lists to only one level
        // Otherwise dependencies between list elements will cause problems
        // when moving particular satellites
        $orbitlistJS_flatten(core);

        // Hide all orbits except first
        core.find('li').filter(function () {
            return $(this).data('height') > 1;
        }).hide();

        // TODO: Way too much show and hide again in the following lines
        // Better filtering is needed!

        // Bind satellite click event
        // TODO: only bind to satellites that actually have children
        // therefore implement isParent property
        core.find('li').click(function (event) {

            satellite = $(this);

            // re-distribute styling classes
            if (satellite.hasClass('orbitlistJS-active')) {
                satellite.removeClass('orbitlistJS-active orbitlistJS-trace');
                satellite.data('parent').addClass('orbitlistJS-active');
            } else {
                core.find('li').removeClass('orbitlistJS-active orbitlistJS-trace');
                satellite.addClass('orbitlistJS-active');
                $orbitlistJS_trace(satellite);
            }

            // Only show satellites with no parents or parent in current trace
            // Calculate current max visible height
            var visibleHeight = 1;
            core.find('li').hide();
            core.find('li').filter(function (index) {
                var parent = $(this).data('parent');
                var showSatellite = !parent.length | parent.hasClass('orbitlistJS-trace');
                if (showSatellite) {
                    visibleHeight = Math.max(visibleHeight, $(this).data('height'));
                }
                return showSatellite;
            }).show();
            core.data('visibleHeight', visibleHeight);

            // Update orbitlist
            $orbitlistJS_update(core);

            // Prevent event bubbling
            event.stopPropagation();
        });

        // Update orbitlist in order to create initial view
        $orbitlistJS_update(core);

        // Update orbitlist on window resize
        $(window).resize(function () {
            $orbitlistJS_update(core);
        });

    });
});
