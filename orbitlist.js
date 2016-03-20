// jQuery um reverse() erweitern
jQuery.fn.reverse = [].reverse;

// Default für Innen- und Außenradius (von 0 bis 1)
var defaultInner = 0;       // Inneres Limit für Radius
var defaultOuter = 1;       // Äußeres Limit für Radius
var defaultBorders = 1;     // Raum zwischen Limit und innerem/äußerem Level

// TODO2: nicht implementiert
var minDensity = 8;
var minDensityLevel1 = 4; // minimale density auf Level 1 - bei Unterschreiten asymmetrisch

function $orbitlistJS_trace(knot) {
    while (knot.length) {
        knot.addClass('orbitlistJS-trace');
        knot = knot.data('parent');
    }
}

function $orbitlistJS_ironOrbit(orbit) {

    // Tiefe des Orbits im Dokument ermitteln
    var baseDepth = orbit.parents().length;
    
    // Variable für Orbittiefe, wird weiter unten überschrieben
    var orbitDepth = 1;

    // Alle Knoten: Elternknoten speichern, dann auf oberste Ebene verschieben
    orbit.find('li').reverse().each(function () {
        
        var knot = $(this);
        
        // Tiefe auswerten und css-Klasse anlegen
        var depth = (knot.parents().length - baseDepth + 1) / 2;
        knot.addClass('orbitlistJS-orbit-' + depth);
        knot.data('depth', depth);
        orbitDepth = Math.max(orbitDepth, depth);

        // Elternknoten speichern sofern vorhanden
        knot.data('parent', knot.parent().parent().filter(".orbit li"));
        orbit.prepend(knot);
                
    });
    
    // Tiefe des Orbits und Tiefe im Dokument in Orbitobjekt speichern
    orbit.data('baseDepth', baseDepth);
    orbit.data('orbitDepth', orbitDepth);
    orbit.data('visibleDepth', 1);
    
    // Alle nun leeren Unterlisten löschen
    orbit.find('ul').remove();

}

function $orbitlistJS_updateOrbit(orbit) {

    var density;
    var angle;

    // Höhe/Breite des umgebenden Elements ermitteln
    var frameW = orbit.parent().width();
    var frameH = orbit.parent().height();
    var radius = Math.min(frameW, frameH);
    var offsetTop = (frameH - radius) / 2;
    var offsetLeft = (frameW - radius) / 2;
    
    // Initiale Knoten
    var knotDepth = 1;
    var knots = orbit.find('.orbitlistJS-orbit-1');

    var borders = orbit.data('orbitlistjs-borders');
    var inner = orbit.data('orbitlistjs-inner');
    var outer = orbit.data('orbitlistjs-outer');
    var visibleDepth = orbit.data('visibleDepth');

    // Alle Ebenen formatieren
    do {

        // Dichte und Winkel der Knoten ermitteln
        if (knotDepth === 1) {
            density = knots.length;
            angle = 0;
        } else {
            var squeeze = 3;
            density = Math.max((knots.length - 1) * squeeze, density); // density mindestens so hoch wie auf höheren Levels
            angle = knots.first().data('parent').data('angle') - 1/(density/(knots.length-1))/2;
        }

        // Alle Knoten formatieren
        knots.each(function (index) {

            // TODO: Zur Verständlichkeit Rechnung aufteilen
            var knot = $(this);
            var distance = (visibleDepth === 1 ? 0.5 : (borders + knotDepth - 1) / (2 * borders + visibleDepth - 1));
            distance = inner + distance * (outer - inner);

            var posTop = radius * distance / 2 * (-Math.cos((index / density + angle) * Math.PI * 2)) + radius / 2 + orbit.parent().offset().top + offsetTop - knot.height() / 2;
            var posLeft = radius * distance / 2 * (Math.sin((index / density + angle) * Math.PI * 2)) + radius / 2 + orbit.parent().offset().left + offsetLeft - knot.width() / 2;
            knot.offset({top: posTop, left: posLeft});
            
            // Winkel für Kindknoten speichern
            knot.data('angle', index / density + angle);
        });
        
        // Eine Ebene tiefer steigen
        knotDepth++;
        knots = orbit.find('.orbitlistJS-orbit-' + knotDepth + ':visible');
        
    } while (knots.length);

}

$(function () {

    // Jede Liste mit .orbit umwandeln
    $('ul.orbit').each(function (index) {

        // Orbit-Objekt erstellen
        var orbit = $(this);

        // Klasse für CSS einfügen
        orbit.addClass('orbitlistJS');

        // Daten für Orbit festlegen
        if (orbit.data('orbitlistjs-inner') === undefined) { orbit.data('orbitlistjs-inner', defaultInner); }
        if (orbit.data('orbitlistjs-outer') === undefined) { orbit.data('orbitlistjs-outer', defaultOuter); }        
        if (orbit.data('orbitlistjs-borders') === undefined) { orbit.data('orbitlistjs-borders', defaultBorders); }

        // Orbit-Hierarchie auf eine Ebene umordnen, um Abhängigkeiten
        // für absolute Positionierung zu lösen
        $orbitlistJS_ironOrbit(orbit);

        // Alle außer Ebene 1 ausblenden
        orbit.find('li').filter(function() { 
            return $(this).data("depth") > 1;
        }).hide();

// TODO: Hier wird noch zu viel doppelt und dreifach geändert - besser filtern!
        // Click-Events binden
        orbit.find('li').click(function(event) {
            
            knot = $(this);

            // Knotenklassen neu verteilen
            if (knot.hasClass('orbitlistJS-active')) {
                knot.removeClass('orbitlistJS-active orbitlistJS-trace');
                knot.data('parent').addClass('orbitlistJS-active');
            } else {
                orbit.find('li').removeClass('orbitlistJS-active orbitlistJS-trace');
                knot.addClass('orbitlistJS-active');
                $orbitlistJS_trace(knot);
            }
            
            // Nur alle Knoten anzeigen, die kein Parent haben oder ein Parent im Trace
            // Außerdem aktuell angezeigte Tiefe berechnen
            var visibleDepth = 1;
            orbit.find('li').hide();
            orbit.find('li').filter(function(index) {
                var parent = $(this).data('parent');
                var showKnot = !parent.length | parent.hasClass('orbitlistJS-trace');
                if (showKnot) { visibleDepth = Math.max(visibleDepth, $(this).data('depth')); }
                return showKnot;
            }).show();
            orbit.data('visibleDepth', visibleDepth);
            
            // Orbit updaten
            $orbitlistJS_updateOrbit(orbit);
            
            // Kein Bubbling für Click-Event
            event.stopPropagation();
        });

        // Orbit updaten
        $orbitlistJS_updateOrbit(orbit);

        // Auch bei resize Orbits neu berechnen
        $(window).resize(function() {
            $orbitlistJS_updateOrbit(orbit);
        });

    });
});
