// jQuery extension: reversion jQuery element order
jQuery.fn.reverse = [].reverse;


// Default values for inner and outer radius limits (between 0 and 1)
var defaultInner = 0;       // Inner limit for radius
var defaultOuter = 1;       // Outer limit for radius
var defaultBorders = 1;     // Factor for space between limit
                            // and inner/outer orbit

// TODO: not yet implemented: Min density of satellites
var minDensity = 8;
var minDensityLevel1 = 4;   // min density for 1st orbit
                            // Orbitlist becomes asymetric if less satellites


// Trace satellite back to root
function $orbitlistJS_trace(satellite) {
    while (satellite.length) {
        satellite.addClass('orbitlistJS-trace');
        satellite = satellite.data('parent');
    }
}


// Flatten Orbitlist HTML to one level only
function $orbitlistJS_flatten(core) {

    // Höhe der Orbitlist im Dokument ermitteln
    var baseHeight = core.parents().length;
    
    // Variable für höchsten Orbit
    var orbitHeight;

    // Alle Satelliten: Elternelement speichern, dann auf oberste Ebene verschieben
    core.find('li').reverse().each(function() {
        
        var satellite = $(this);
        
        // Höhe auswerten und css-Klasse anlegen
        var height = (satellite.parents().length - baseHeight + 1) / 2;
        satellite.addClass('orbitlistJS-orbit-' + height);
        satellite.data('height', height);
        orbitHeight = Math.max(orbitHeight, height);

        // Verweis auf Elternelement speichern sofern vorhanden
        satellite.data('parent', satellite.parent().parent().filter(".orbit li"));
        core.prepend(satellite);
                
    });
    
    // Höhe des Orbits und Höhe im Dokument in Core speichern
    core.data('baseHeight', baseHeight);
    core.data('orbitHeight', orbitHeight);
    
    // Aktuell sichtbare Höhe ist initial 1
    core.data('visibleHeight', 1);
    
    // Alle (nun leeren) Unterlisten löschen
    core.find('ul').remove();

}

function $orbitlistJS_update(core) {

    var density;    // Density of satellites shown
    var angle;      // Starting angle

    // Höhe/Breite des umgebenden Elements ermitteln
    var frameW = core.parent().width();
    var frameH = core.parent().height();
    var radius = Math.min(frameW, frameH) / 2;
    var offsetTop = frameH / 2 - radius;
    var offsetLeft = frameW / 2 - radius;
    
    // Erster/niedrigster Orbit
    var orbitHeight = 1;
    var orbit = core.find('.orbitlistJS-orbit-1');

    // Eigenschaften der Orbitlist lesen
    var borders = core.data('orbitlistjs-borders');
    var inner = core.data('orbitlistjs-inner');
    var outer = core.data('orbitlistjs-outer');
    var visibleHeight = core.data('visibleHeight');

    // Alle sichtbaren Orbits formatieren
    do {

        // Dichte und Winkel der Satelliten ermitteln
        if (orbitHeight === 1) {
            density = orbit.length;
            angle = 0;
        } else {
            var squeeze = 3;    // TODO: zu variablem Parameter ändern
            // density mindestens so hoch wie im niedrigeren Orbit
            density = Math.max((orbit.length - 1) * squeeze, density);
            angle = orbit.first().data('parent').data('angle') - 1/(density/(orbit.length-1))/2;
        }

        // Alle Satelliten formatieren
        orbit.each(function(index) {

            // TODO: Zur Verständlichkeit Rechnung aufteilen
            var satellite = $(this);
            var distance = (visibleHeight === 1 ? 0.5 : (borders + orbitHeight - 1) / (2 * borders + visibleHeight - 1));
            distance = inner + distance * (outer - inner);

            // Position satellite
            var posTop = radius * distance * (-Math.cos((index / density + angle) * Math.PI * 2)) + radius + core.parent().offset().top + offsetTop - satellite.height() / 2;
            var posLeft = radius * distance * (Math.sin((index / density + angle) * Math.PI * 2)) + radius + core.parent().offset().left + offsetLeft - satellite.width() / 2;
            satellite.offset({top: posTop, left: posLeft});
            
            // Winkel für Kindsatelliten speichern
            satellite.data('angle', index / density + angle);
            
        });
        
        // Eine Ebene höher steigen
        orbitHeight++;
        orbit = core.find('.orbitlistJS-orbit-' + orbitHeight + ':visible');
        
    } while (orbit.length);

}


// Document ready setup
$(function () {

    // Jede Liste mit Klasse .orbit in Orbitlist umwandeln
    $('ul.orbit').each(function(index) {

        // Orbitlist Core erstellen
        var core = $(this);

        // Klasse für CSS einfügen
        core.addClass('orbitlistJS');

        // Eigenschaften für Orbitlist festlegen
        if (core.data('orbitlistjs-inner') === undefined)   { core.data('orbitlistjs-inner', defaultInner); }
        if (core.data('orbitlistjs-outer') === undefined)   { core.data('orbitlistjs-outer', defaultOuter); }        
        if (core.data('orbitlistjs-borders') === undefined) { core.data('orbitlistjs-borders', defaultBorders); }

        // HTML-Listen auf eine Ebene reduzieren
        // Andernfalls Probleme beim verschieben von absolut positionierten
        // Elementen wegen Abhängigkeiten
        $orbitlistJS_flatten(core);

        // Alle Orbits außer den ersten ausblenden
        core.find('li').filter(function() { 
            return $(this).data('height') > 1;
        }).hide();

        // TODO: Hier wird noch zu viel doppelt und dreifach geändert,
        // ein- und ausgeblendet - besser filtern!

        // Click-Events an Satelliten binden binden
        // TODO: nur an Satelliten mit Kindern binden, dazu
        // isParent-Eigenschaft implementieren
        core.find('li').click(function(event) {
            
            satellite = $(this);

            // Satellitenklassen neu verteilen
            if (satellite.hasClass('orbitlistJS-active')) {
                satellite.removeClass('orbitlistJS-active orbitlistJS-trace');
                satellite.data('parent').addClass('orbitlistJS-active');
            } else {
                core.find('li').removeClass('orbitlistJS-active orbitlistJS-trace');
                satellite.addClass('orbitlistJS-active');
                $orbitlistJS_trace(satellite);
            }
            
            // Nur Knoten anzeigen, die kein Parent haben oder ein Parent im Trace
            // Außerdem aktuell angezeigte Tiefe berechnen
            var visibleHeight = 1;
            core.find('li').hide();
            core.find('li').filter(function(index) {
                var parent = $(this).data('parent');
                var showSatellite = !parent.length | parent.hasClass('orbitlistJS-trace');
                if (showSatellite) { visibleHeight = Math.max(visibleHeight, $(this).data('height')); }
                return showSatellite;
            }).show();
            core.data('visibleHeight', visibleHeight);
            
            // Orbitlist updaten
            $orbitlistJS_update(core);
            
            // Kein Bubbling für Click-Event
            event.stopPropagation();
        });

        // Orbitlist updaten für Startansicht
        $orbitlistJS_update(core);

        // Auch bei resize Orbitlist neu berechnen
        $(window).resize(function() {
            $orbitlistJS_update(core);
        });

    });
});
