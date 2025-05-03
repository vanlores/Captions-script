/*
    Markers From Text.jsx  v.1.6
    – nový marker vzniká jen po prázdném řádku (odstavce).
*/
(function markersFromText(thisObj){

    /* ---------- UI (beze změn) ---------- */
    function buildUI(p){var w=(p instanceof Panel)?p:new Window("palette","Markers From Text");
        w.orientation="column";w.alignChildren=["fill","top"];w.margins=6;
        w.add("statictext",undefined,"Write text – blank line = new marker:");
        w.textInput=w.add("edittext",undefined,"",{multiline:true,scrolling:true});
        w.textInput.preferredSize=[250,450];
        var g=w.add("group");w.applyBtn=g.add("button",undefined,"Apply");
        w.closeBtn=g.add("button",undefined,"Close");
        w.closeBtn.onClick=function(){w.close();};
        w.applyBtn.onClick=function(){applyMarkers(w);};
        w.layout.layout(true);return w;}
    var win=buildUI(thisObj);if(win.toString()!=="[object Panel]"){win.center();win.show();}

    /* ---------- hlavní část ---------- */
    function applyMarkers(win){

        /* 1 · základní kontroly */
        var comp = app.project.activeItem;
        if(!(comp && comp instanceof CompItem)){alert("Please select a composition.");return;}
        if(comp.selectedLayers.length===0){alert("Please select a text layer.");return;}
        var layer = comp.selectedLayers[0],
            st = layer.property("Text") && layer.property("Text").property("Source Text");
        if(!st){alert("Selected layer is not a text layer.");return;}

        /* 2 · rozparsuj text na odstavce = markery */
        var rawLines = win.textInput.text.split(/\r\n|\r|\n/),
            paragraphs = [],
            current = [];

        for(var i=0;i<rawLines.length;i++){
            var l = rawLines[i].replace(/\s+$/,"");          // ořízni koncovou mezeru
            if(l === ""){                                   // prázdný řádek → konec odstavce
                if(current.length){ paragraphs.push(current.join("\r")); current=[]; }
            }else{
                current.push(l);                            // přidej řádek do probíhajícího odstavce
            }
        }
        if(current.length) paragraphs.push(current.join("\r")); // poslední odstavec

        if(paragraphs.length===0){alert("Enter some text.");return;}

        /* 3 · vytvoř markery */
        app.beginUndoGroup("Markers From Text");

        var mProp = layer.property("Marker");
        while(mProp.numKeys) mProp.removeKey(1);            // smaž staré

        var span = layer.outPoint - layer.inPoint;
        if(span<=0){alert("Layer length is zero.");app.endUndoGroup();return;}
        var step = span / paragraphs.length;

        for(i=0;i<paragraphs.length;i++){
            var t  = layer.inPoint + i*step,
                mv = new MarkerValue(paragraphs[i]);        // komentář = celý odstavec
            mProp.setValueAtTime(t, mv);
        }

        // 4 · expression pro Source Text
var lit = [];
for (var i = 0; i < paragraphs.length; i++) {
    lit.push(
        "\"" +
        paragraphs[i]
            .replace(/"/g, "\\\"")
            .replace(/\r/g, "\\r")       // <-- tady přidá \r mezi řádky
        + "\""
    );
}
var ex  = "var a=[" + lit.join(",") + "];\n" +
          "var n=thisLayer.marker.numKeys;\n" +
          "var t=\"\";\n" +
          "if(n>0){\n" +
          "  for(var k=1;k<=n;k++){\n" +
          "    if(time>=thisLayer.marker.key(k).time){\n" +
          "      t=a[Math.min(k-1,a.length-1)];\n" +
          "    }\n" +
          "  }\n" +
          "}\n" +
          "t;";
st.expression = ex;

        app.endUndoGroup();
        alert("Markers added: "+mProp.numKeys);
    }

})(this);
