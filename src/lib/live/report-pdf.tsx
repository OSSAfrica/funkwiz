import { scoringFor, scoringSummary } from "./scoring";
import fontRegular from "@fontsource/nunito-sans/files/nunito-sans-latin-400-normal.woff?url";
import fontBold from "@fontsource/nunito-sans/files/nunito-sans-latin-700-normal.woff?url";
import type { GameReport } from "@/lib/live/protocol";
import { reportDate, reportSummary } from "@/lib/live/report-export";

let fontsRegistered = false;

// Imported on demand; no renderer code is loaded until a PDF is requested.
export async function reportPdf(report: GameReport) {
  const { Document, Font, Page, StyleSheet, Text, View, pdf } =
    await import("@react-pdf/renderer");
  if (!fontsRegistered) {
    Font.register({
      family: "Nunito",
      fonts: [
        { src: fontRegular, fontWeight: 400 },
        { src: fontBold, fontWeight: 700 },
      ],
    });
    fontsRegistered = true;
  }

  const forest = "#153f35",
    gold = "#f9dc80",
    cream = "#fffefb";
  const styles = StyleSheet.create({
    page: {
      padding: 38,
      paddingTop: 88,
      paddingBottom: 55,
      color: forest,
      backgroundColor: cream,
      fontFamily: "Nunito",
      fontSize: 10,
    },
    header: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 65,
      backgroundColor: forest,
      padding: "15 38",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    brand: { color: gold, fontSize: 25, fontFamily: "Nunito", fontWeight: 700 },
    headerNote: { color: "#d6e5a7", fontSize: 9 },
    eyebrow: {
      fontSize: 9,
      letterSpacing: 1.3,
      color: "#68736e",
      marginBottom: 9,
    },
    title: {
      fontSize: 28,
      fontFamily: "Nunito",
      fontWeight: 700,
      marginBottom: 10,
    },
    subtitle: { color: "#68736e", marginBottom: 22 },
    stats: { flexDirection: "row", gap: 10, marginBottom: 26 },
    stat: {
      flexGrow: 1,
      flexBasis: 0,
      padding: 15,
      borderRadius: 10,
      backgroundColor: "#e2ebd0",
    },
    number: { fontSize: 24, fontFamily: "Nunito", fontWeight: 700 },
    section: {
      fontSize: 19,
      fontFamily: "Nunito",
      marginTop: 14,
      marginBottom: 12,
    },
    row: {
      flexDirection: "row",
      gap: 8,
      padding: "9 10",
      borderBottom: "1 solid #e7e8df",
    },
    columnHead: {
      backgroundColor: forest,
      color: cream,
      fontFamily: "Nunito",
      fontWeight: 700,
    },
    rank: { width: 35 },
    name: { flexGrow: 1, flexBasis: 0 },
    score: { width: 80, textAlign: "right" },
    correct: { width: 70, textAlign: "right" },
    question: {
      backgroundColor: "#f1f0e9",
      padding: 15,
      borderRadius: 10,
      marginBottom: 13,
    },
    questionTitle: {
      fontFamily: "Nunito",
      fontWeight: 700,
      fontSize: 12,
      marginBottom: 6,
    },
    answer: {
      padding: "5 8",
      marginTop: 5,
      borderRadius: 4,
      backgroundColor: cream,
    },
    footer: {
      position: "absolute",
      bottom: 22,
      left: 38,
      right: 38,
      color: "#68736e",
      fontSize: 8,
      height: 14,
    },
  });
  const summary = reportSummary(report);
  const document = (
    <Document
      title={`${report.title} - Classroom report`}
      author="Funkwiz"
      subject={`Game ${report.code}`}
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <Text style={styles.brand}>funkwiz.</Text>
          <Text style={styles.headerNote}>
            Curious minds. Happy classrooms.
          </Text>
        </View>
        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `Funkwiz | Game ${report.code} | Teacher report                                       ${pageNumber} / ${totalPages}`
          }
        />
        <Text style={styles.eyebrow}>AFTER THE AHA!</Text>
        <Text style={styles.title}>{report.title}</Text>
        <Text style={styles.subtitle}>
          Game {report.code} | {reportDate(report)} (UTC)
        </Text>
        <View style={styles.stats} wrap={false}>
          <View style={styles.stat}>
            <Text style={styles.number}>{report.playerCount}</Text>
            <Text>Curious minds</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: gold }]}>
            <Text style={styles.number}>{summary.accuracy}%</Text>
            <Text>Answer accuracy</Text>
          </View>
          <View style={[styles.stat, { backgroundColor: "#e6def0" }]}>
            <Text style={styles.number}>{summary.played}</Text>
            <Text>Questions played</Text>
          </View>
        </View>
        <Text style={styles.section} minPresenceAhead={65}>
          Every curious mind counts.
        </Text>
        <View style={[styles.row, styles.columnHead]} wrap={false}>
          <Text style={styles.rank}>Rank</Text>
          <Text style={styles.name}>Nickname</Text>
          <Text style={styles.score}>Points</Text>
        </View>
        {report.leaderboard.map((p, index) => (
          <View
            key={p.id}
            style={[
              styles.row,
              index % 2 === 0 ? { backgroundColor: "#f1f4eb" } : {},
            ]}
            wrap={false}
          >
            <Text style={styles.rank}>{p.rank}</Text>
            <Text style={styles.name}>{p.nickname}</Text>
            <Text style={styles.score}>{p.score.toLocaleString("en-GB")}</Text>
          </View>
        ))}
        {!report.leaderboard.length && (
          <Text>No players joined this game.</Text>
        )}
        <Text style={{ color: "#68736e", fontSize: 9, marginTop: 8 }}>
          {scoringSummary(scoringFor(report))} Equal scores share a rank.
        </Text>
        <Text style={styles.section} minPresenceAhead={100}>
          A closer look at the questions.
        </Text>
        {report.questions.map((q, i) => (
          <View key={q.id} style={styles.question}>
            <Text style={styles.questionTitle} minPresenceAhead={38}>
              Q{i + 1}. {q.prompt}
            </Text>
            <Text>
              {q.asked ? `${q.correct} / ${q.answered} correct` : "Not asked"}
            </Text>
            {q.answers.map((answer, index) => (
              <View
                key={["a", "b", "c", "d"][index]}
                style={[
                  styles.answer,
                  q.correctIndex === index
                    ? { backgroundColor: "#dce8c7" }
                    : {},
                ]}
                wrap={false}
              >
                <Text>
                  {String.fromCharCode(65 + index)}. {answer}
                  {q.correctIndex === index ? " (correct answer)" : ""} -{" "}
                  {q.counts[index] ?? 0} responses
                </Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
  return pdf(document).toBlob();
}
