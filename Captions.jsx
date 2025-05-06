/*
    Markers From Text.jsx  v.1.7
    – Apply: markers + expression
    – Apply Text: pouze expression podle existujících markerů
*/
(function markersFromText(thisObj){

    /* ---------- Build UI ---------- */
    function buildUI(p){
        var w = (p instanceof Panel) ? p : new Window("palette","Markers From Text");
        w.orientation   = "column";
        w.alignChildren = ["fill","top"];
        w.margins       = 6;

        w.add("statictext",undefined,
              "Write text – blank line = new marker:");

        w.textInput = w.add("edittext",undefined,"",
                            {multiline:true,scrolling:true});
        w.textInput.preferredSize = [200,450];

        var g = w.add("group");
        g.orientation = "row";
        g.alignChildren = "center";

        w.applyMarkersBtn = g.add("button",undefined,"Apply");
        w.applyTextBtn    = g.add("button",undefined,"Apply Text");
        w.closeBtn        = g.add("button",undefined,"Close");

        // eventy
        w.applyMarkersBtn.onClick = function(){ applyMarkers(w); };
        w.applyTextBtn   .onClick = function(){ applyExpressionOnly(w); };
        w.closeBtn       .onClick = function(){ w.close(); };

        w.layout.layout(true);
        return w;
    }

    var win = buildUI(thisObj);
    if (win.toString()!=="[object Panel]"){ win.center(); win.show(); }

    /* ---------- Helpers ---------- */

    function alertIfNoTextLayer(comp){
        if (!comp || !(comp instanceof CompItem)) {
            alert("Please select a composition."); return false;
        }
        if (comp.selectedLayers.length===0) {
            alert("Please select a text layer."); return false;
        }
        var layer = comp.selectedLayers[0];
        if (!layer.property("Text") ||
            !layer.property("Text").property("Source Text")) {
            alert("Selected layer is not a text layer."); return false;
        }
        return true;
    }

    function buildExpression(paragraphs){
        // escape quotes and CR
        var lit = [];
        for (var i=0; i<paragraphs.length; i++){
            lit.push(
                "\"" +
                paragraphs[i]
                    .replace(/"/g, "\\\"")
                    .replace(/\r/g, "\\r")
                + "\""
            );
        }
        var ex  = "var a=[" + lit.join(",") + "];\n";
            ex += "var n=thisLayer.marker.numKeys;\n";
            ex += "var t=\"\";\n";
            ex += "if(n>0){\n";
            ex += "  for(var k=1;k<=n;k++){\n";
            ex += "    if(time>=thisLayer.marker.key(k).time){\n";
            ex += "      t=a[Math.min(k-1,a.length-1)];\n";
            ex += "    }\n";
            ex += "  }\n";
            ex += "}\n";
            ex += "t;";
        return ex;
    }

    function getParagraphsFromInput(win){
        var raw = win.textInput.text.split(/\r\n|\r|\n/),
            paras = [], curr = [];
        for (var i=0; i<raw.length; i++){
            var l = raw[i].replace(/\s+$/,"");
            if (l===""){
                if (curr.length){ paras.push(curr.join("\r")); curr = []; }
            } else {
                curr.push(l);
            }
        }
        if (curr.length) paras.push(curr.join("\r"));
        return paras;
    }

    /* ---------- Main actions ---------- */

    function applyMarkers(win){
        var comp = app.project.activeItem;
        if (!alertIfNoTextLayer(comp)) return;
        var layer = comp.selectedLayers[0];

        // parse paragraphs → marker count
        var paras = getParagraphsFromInput(win);
        if (paras.length===0){ alert("Enter some text."); return; }

        app.beginUndoGroup("Markers From Text");

        // smaž staré markery
        var m = layer.property("Marker");
        while (m.numKeys) m.removeKey(1);

        // nový rozsah = in→out
        var span = layer.outPoint - layer.inPoint;
        if (span<=0) {
            alert("Layer length is zero.");
            app.endUndoGroup();
            return;
        }
        var step = span / paras.length;
        for (var i=0; i<paras.length; i++){
            var t  = layer.inPoint + i*step,
                mv = new MarkerValue(paras[i]);
            m.setValueAtTime(t,mv);
        }

        // pak aplikuj expression
        var st = layer.property("Text").property("Source Text");
        st.expression = buildExpression(paras);

        app.endUndoGroup();
        alert("Markers and expression applied.");
    }

    function applyExpressionOnly(win){
        var comp = app.project.activeItem;
        if (!alertIfNoTextLayer(comp)) return;
        var layer = comp.selectedLayers[0];

        // vezmi už existující markery a naparsuj z inputu stejný počet paragraphs
        var m = layer.property("Marker"),
            count = m.numKeys,
            paras = getParagraphsFromInput(win);

        if (count===0){
            alert("No markers present. Use Apply first.");
            return;
        }
        if (paras.length < count){
            alert("Not enough paragraphs for " + count + " markers.");
            return;
        }

        app.beginUndoGroup("Apply Text Only");

        // aplikuj expression podle prvních `count` paragraphs
        var st = layer.property("Text").property("Source Text"),
            expr = buildExpression(paras.slice(0,count));
        st.expression = expr;

        app.endUndoGroup();
        alert("Expression applied only.");
    }

})(this);
