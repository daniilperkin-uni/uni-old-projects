import com.example.einf.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;

/**
 * Reference-value dumper for the website's JS port of the grade simulator.
 * Builds module lists (300 randomised + the app's NotensimulatorTest cases +
 * the demo semester from the captures), runs the real Java LeistungsRechner
 * on them and writes id;spec;values... to a CSV. tools/validate-simulator.mjs
 * replays the same specs through sim.js and compares doubles exactly.
 *
 * Compile/run against the app's compiled classes:
 *   javac -cp target/classes -d <out> tools/MathProbe.java
 *   java  -cp "<out>;target/classes" MathProbe tools/simulator-cases.csv
 */
public class MathProbe {

    static final double[] NOTES = {1.0, 1.3, 1.7, 2.0, 2.3, 2.7, 3.0, 3.3, 3.7, 4.0, 5.0};
    static final double[] SIMW = {1.0, 2.0, 2.5, 3.0};
    static final double[] NEEDZ = {1.0, 1.5, 2.0, 2.5, 3.0};

    public static void main(String[] args) throws Exception {
        StringBuilder out = new StringBuilder();

        // fixed cases mirroring the app's own NotensimulatorTest
        out.append(emit("test-projection-allopen", List.of(note("A", 5, null), note("B", 5, null))));
        out.append(emit("test-projection-weighted", List.of(note("Fix", 10, 1.0), note("Offen", 10, null))));
        out.append(emit("test-sl-ignored", List.of(note("A", 5, 2.0), studien("SL", 5))));
        out.append(emit("test-required-exact", List.of(note("Fix", 6, 2.5), note("Offen", 4, null))));
        out.append(emit("test-impossible", List.of(note("Fix", 30, 4.0), note("Offen", 2, null))));
        out.append(emit("test-unreachable-after-fix", List.of(note("A", 5, 1.0))));

        // the exact demo semester shown in the captures
        out.append(emit("demo-full-semester", List.of(
                studien("Einf\u00fchrung in die Informatik", 5),
                note("Programmieren I", 5, 1.7),
                note("Mathematik f\u00fcr Informatiker I", 6, 2.3),
                note("Programmieren II", 5, 1.3),
                note("Datenstrukturen und Algorithmen", 8, 2.0),
                note("Lineare Algebra", 6, 3.0),
                note("Rechnernetze", 5, 1.0),
                note("Softwaretechnik", 6, 2.7),
                note("Betriebssysteme", 5, null),
                note("Theoretische Informatik", 8, null),
                note("Computergrafik", 5, null),
                studien("Studienprojekt", 5))));

        // randomised cases
        Random rnd = new Random(20261002L);
        for (int ci = 0; ci < 300; ci++) {
            int n = rnd.nextInt(15);
            List<Modul> mods = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                int ects = 1 + rnd.nextInt(12);
                int kind = rnd.nextInt(3);
                if (kind == 0) mods.add(note("M" + i, ects, NOTES[rnd.nextInt(NOTES.length)]));
                else if (kind == 1) mods.add(note("M" + i, ects, null));
                else mods.add(studien("M" + i, ects));
            }
            out.append(emit("rnd-" + ci, mods));
        }

        Files.writeString(Path.of(args[0]), out.toString());
        System.out.println("wrote cases to " + args[0]);
    }

    static Modul note(String name, int ects, Double note) {
        Modul m = new Modul(name, ects, true, null);
        if (note != null) m.setLeistung(new Pruefungsleistung(m, note));
        return m;
    }

    static Modul studien(String name, int ects) {
        Modul m = new Modul(name, ects, false, null);
        m.setLeistung(new Studienleistung(m, true));
        return m;
    }

    static String spec(List<Modul> mods) {
        StringBuilder b = new StringBuilder();
        for (Modul m : mods) {
            if (b.length() > 0) b.append(',');
            b.append(m.getEcts()).append(':');
            if (!m.istBenotet()) b.append('s');
            else if (m.getLeistung() instanceof Pruefungsleistung p) b.append("n:").append(p.getErreichteNote());
            else b.append('o');
        }
        return b.toString();
    }

    static String emit(String id, List<Modul> mods) {
        LeistungsRechner r = new LeistungsRechner(mods);
        StringBuilder b = new StringBuilder();
        b.append(id).append(';').append(spec(mods));
        b.append(';').append(fmt(r.berechneNotendurchschnitt()));
        for (double w : SIMW) b.append(';').append(opt(r.simuliereNotendurchschnitt(w)));
        for (double z : NEEDZ) b.append(';').append(opt(r.benoetigteNoteFuerZiel(z)));
        b.append('\n');
        return b.toString();
    }

    static String fmt(double d) { return String.format(java.util.Locale.ROOT, "%.17g", d); }

    static String opt(Optional<Double> o) { return o.map(MathProbe::fmt).orElse("NaN"); }
}
