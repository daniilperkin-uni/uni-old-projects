package com.example.einf;

import javafx.animation.PauseTransition;
import javafx.application.Platform;
import javafx.fxml.FXMLLoader;
import javafx.geometry.Bounds;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.SnapshotParameters;
import javafx.scene.control.Button;
import javafx.scene.control.DialogPane;
import javafx.scene.control.TabPane;
import javafx.scene.image.PixelFormat;
import javafx.scene.image.PixelReader;
import javafx.scene.image.WritableImage;
import javafx.scene.transform.Transform;
import javafx.stage.Screen;
import javafx.stage.Stage;
import javafx.stage.Window;
import javafx.util.Duration;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Website capture harness: boots the real app with the same wiring as
 * Main.start() against a redirected demo home (never touches real data),
 * drives all three tabs plus the two grade dialogs, snapshots each to PNG.
 * Run: java -Duser.home=<demo> -cp <cp> com.example.einf.CaptureHarness <demoHome> <outDir>
 */
public class CaptureHarness {

    static Stage stage;
    static Scene scene;
    static GradesTabController gradesTab;
    static Path outDir;

    public static void main(String[] args) throws Exception {
        Path demoHome = Path.of(args[0]).toAbsolutePath();
        outDir = Path.of(args[1]).toAbsolutePath();
        Files.createDirectories(outDir);
        System.setProperty("user.home", demoHome.toString());

        Platform.startup(() -> {
            try {
                boot();
            } catch (Throwable t) {
                t.printStackTrace();
                Platform.exit();
            }
        });
        // watchdog: never hang the machine if a dialog probe misses
        Runtime.getRuntime().addShutdownHook(new Thread(() -> System.out.println("[harness] exiting")));
        // keep main thread alive so the JVM never exits before the capture chain finishes
        try { Thread.sleep(Long.MAX_VALUE); } catch (InterruptedException ignored) { }
    }

    static void boot() throws Exception {
        SpeicherManager sm = new SpeicherManager();
        sm.ladeDaten();
        System.out.println("[harness] modules=" + sm.getModule().size() + " deadlines=" + sm.getDeadlines().size());

        FXMLLoader loader = new FXMLLoader(Main.class.getResource("/com/example/einf/views/home-view.fxml"));
        scene = new Scene(loader.load());
        scene.getStylesheets().add(Main.class.getResource("/com/example/einf/styles/app.css").toExternalForm());

        HomeController controller = loader.getController();
        ModulVerwaltung mv = new ModulVerwaltung(sm.getModule());
        DeadlineManager dm = new DeadlineManager(sm.getDeadlines());
        controller.setModulVerwaltung(mv);
        controller.setDeadlineManager(dm);
        controller.setSpeicherManager(sm);
        controller.initializeControllers();

        Field f = HomeController.class.getDeclaredField("gradesTab");
        f.setAccessible(true);
        gradesTab = (GradesTabController) f.get(controller);

        stage = new Stage();
        stage.setTitle("Studentischer Organisationshelfer");
        stage.setScene(scene);
        stage.setWidth(1460);
        stage.setHeight(940);
        stage.setX(40);
        stage.setY(16);
        stage.show();

        System.out.println("[harness] scene " + (int) scene.getWidth() + "x" + (int) scene.getHeight()
                + " outScale=" + Screen.getPrimary().getOutputScaleX());

        TabPane tabs = (TabPane) scene.getRoot();
        next(900, () -> {
            tabs.getSelectionModel().select(0);
            next(650, () -> {
                snapScene("module-tab");
                next(250, () -> {
                    tabs.getSelectionModel().select(1);
                    next(650, () -> {
                        snapScene("fristen-tab");
                        next(250, () -> {
                            tabs.getSelectionModel().select(2);
                            next(2000, () -> {
                                snapScene("noten-tab");
                                simulatorFlow();
                            });
                        });
                    });
                });
            });
        });
        next(90000, () -> { System.out.println("[harness] TIMEOUT"); System.exit(2); });
    }

    /** Delay then run on the FX thread; PauseTransition keeps ticking inside nested dialog loops. */
    static void next(int ms, Runnable r) {
        PauseTransition p = new PauseTransition(Duration.millis(ms));
        p.setOnFinished(e -> {
            try { r.run(); } catch (Throwable t) { t.printStackTrace(); }
        });
        p.play();
    }

    static void snapScene(String name) {
        snapToFile(scene, name, true);
    }

    static void snapToFile(Object target, String name, boolean tryDouble) {
        try {
            if (target instanceof Scene sc) {
                writePng(sc.snapshot(null), name + ".png", "1x");
                if (tryDouble && sc.getRoot() != null) {
                    snap2x(sc.getRoot(), name);
                }
            } else if (target instanceof Node n) {
                writePng(n.snapshot(null, null), name + ".png", "1x");
                snap2x(n, name); // dialogs get the 2x attempt too
            }
        } catch (Throwable t) {
            System.out.println("[harness] snapshot failed for " + name + ": " + t);
            t.printStackTrace();
        }
    }

    static void snap2x(Node n, String name) throws Exception {
        Bounds b = n.getLayoutBounds();
        SnapshotParameters sp = new SnapshotParameters();
        sp.setTransform(Transform.scale(2, 2));
        WritableImage img2 = new WritableImage((int) Math.ceil(b.getWidth() * 2), (int) Math.ceil(b.getHeight() * 2));
        n.snapshot(sp, img2);
        writePng(img2, name + "@2x.png", "2x attempt");
    }

    static void writePng(WritableImage img, String fileName, String label) throws Exception {
        int w = (int) img.getWidth(), h = (int) img.getHeight();
        BufferedImage bi = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
        int[] buf = new int[w * h];
        img.getPixelReader().getPixels(0, 0, w, h, PixelFormat.getIntArgbInstance(), buf, 0, w);
        bi.setRGB(0, 0, w, h, buf, 0, w);
        File file = new File(outDir.toFile(), fileName);
        ImageIO.write(bi, "png", file);
        System.out.println("[harness] wrote " + fileName + " " + w + "x" + h + " (" + label + ")");
    }

    static Window findDialogWindow() {
        for (Window w : Window.getWindows()) {
            if (w != stage && w.isShowing()) {
                System.out.println("[harness] window: " + (w instanceof Stage s ? s.getTitle() : "?"));
                return w;
            }
        }
        return null;
    }

    static void simulatorFlow() {
        next(400, () -> {
            // probes are queued before the dialogs open; they fire inside the nested event loops
            next(900, () -> {
                Window dlg = findDialogWindow();
                if (dlg == null) { System.out.println("[harness] input dialog not found"); return; }
                snapToFile(dlg.getScene().getRoot(), "notensimulator-input", false);
                next(1500, () -> {
                    Window alert = findDialogWindow();
                    if (alert == null) { System.out.println("[harness] result alert not found"); return; }
                    snapToFile(alert.getScene().getRoot(), "notensimulator-result", false);
                    next(250, alert::hide);
                });
                if (dlg.getScene().getRoot() instanceof DialogPane pane
                        && pane.lookupButton(javafx.scene.control.ButtonType.OK) instanceof Button ok) {
                    System.out.println("[harness] firing OK");
                    Platform.runLater(ok::fire);
                } else {
                    System.out.println("[harness] OK button not found, closing");
                    dlg.hide();
                }
            });
            // showAndWait must not run inside an animation handler -> defer to the event queue
            Platform.runLater(() -> {
                gradesTab.showGradeSimulator(); // blocks until both dialogs are closed
                next(300, CaptureHarness::semesterDashboardFlow);
            });
        });
    }

    static void semesterDashboardFlow() {
        next(300, () -> {
            next(900, () -> {
                Window dlg = findDialogWindow();
                if (dlg == null) { System.out.println("[harness] dashboard not found"); return; }
                snapToFile(dlg.getScene().getRoot(), "semester-dashboard", false);
                next(250, dlg::hide);
            });
            Platform.runLater(() -> {
                gradesTab.showSemesterDashboard();
                next(600, CaptureHarness::finish);
            });
        });
    }

    static void finish() {
        System.out.println("CAPTURES DONE");
        Platform.exit();
        System.exit(0);
    }
}
