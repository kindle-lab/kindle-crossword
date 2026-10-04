#include "crossword.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static size_t utf8_to_codepoints(const char *s, uint32_t *out, size_t max) {
    const unsigned char *p = (const unsigned char *)s; size_t n = 0; uint32_t cp; int more;
    while (*p && n < max) {
        if (*p < 0x80) { cp = *p++; }
        else if ((*p & 0xe0) == 0xc0 && p[1]) { cp = (*p++ & 0x1f) << 6; cp |= *p++ & 0x3f; }
        else if ((*p & 0xf0) == 0xe0 && p[1] && p[2]) { cp = (*p++ & 0x0f) << 12; cp |= (*p++ & 0x3f) << 6; cp |= *p++ & 0x3f; }
        else if ((*p & 0xf8) == 0xf0 && p[1] && p[2] && p[3]) { cp = (*p++ & 7) << 18; cp |= (*p++ & 0x3f) << 12; cp |= (*p++ & 0x3f) << 6; cp |= *p++ & 0x3f; }
        else { p++; continue; }
        out[n++] = cp;
    }
    more = (*p != '\0');
    return more ? 0 : n;
}

static void print_cp(uint32_t cp) {
    if (cp < 0x80) putchar((int)cp);
    else if (cp < 0x800) printf("%c%c", (int)(0xc0 | (cp >> 6)), (int)(0x80 | (cp & 0x3f)));
    else if (cp < 0x10000) printf("%c%c%c", (int)(0xe0 | (cp >> 12)), (int)(0x80 | ((cp >> 6) & 0x3f)), (int)(0x80 | (cp & 0x3f)));
    else printf("%c%c%c%c", (int)(0xf0 | (cp >> 18)), (int)(0x80 | ((cp >> 12) & 0x3f)), (int)(0x80 | ((cp >> 6) & 0x3f)), (int)(0x80 | (cp & 0x3f)));
}

static int all_correct(const CrosswordPuzzle *p, uint32_t user[10][10]) {
    int r, c; for (r = 0; r < 10; r++) for (c = 0; c < 10; c++) if (p->occupied[r][c] && user[r][c] != p->letters[r][c]) return 0; return 1;
}

static void play(const CrosswordPuzzle *p) {
    uint32_t user[10][10] = {{0}}; size_t selected = 0; char line[4096];
    for (;;) {
        size_t n; int r, c; const CrosswordClue *q;
        puts("\033[2J\033[H한국일보 크로스워드");
        for (r = 0; r < 10; r++) { for (c = 0; c < 10; c++) { if (user[r][c]) print_cp(user[r][c]); else if (p->occupied[r][c]) putchar('.'); else putchar(' '); if (c != 9) putchar(' '); } putchar('\n'); }
        q = &p->clues[selected]; printf("\n[%s %02d] %s\n", q->direction == CROSSWORD_ACROSS ? "가로" : "세로", q->number, q->definition[0] ? q->definition : q->clue);
        puts("명령: i 입력 / n 다음 문항 / p 이전 문항 / q 종료"); fputs("> ", stdout); fflush(stdout);
        if (!fgets(line, sizeof(line), stdin)) return;
        if (line[0] == 'q' || line[0] == 'Q') return;
        if (line[0] == 'n' || line[0] == 'N') { selected = (selected + 1) % p->clue_count; continue; }
        if (line[0] == 'p' || line[0] == 'P') { selected = selected ? selected - 1 : p->clue_count - 1; continue; }
        if (line[0] == 'i' || line[0] == 'I') {
            char answer[1024]; uint32_t letters[CROSSWORD_MAX_ANSWER]; size_t count;
            fputs("답 입력: ", stdout); fflush(stdout); if (!fgets(answer, sizeof(answer), stdin)) return;
            answer[strcspn(answer, "\r\n")] = '\0'; count = utf8_to_codepoints(answer, letters, CROSSWORD_MAX_ANSWER);
            if (!count) { puts("입력을 읽지 못했습니다. Enter를 누르세요."); fgets(line, sizeof(line), stdin); continue; }
            for (n = 0; n < q->letter_count && n < count; n++) { r = q->row + (q->direction == CROSSWORD_DOWN ? (int)n : 0); c = q->col + (q->direction == CROSSWORD_ACROSS ? (int)n : 0); user[r][c] = letters[n]; }
            if (all_correct(p, user)) { puts("\n정답입니다. Enter를 누르면 종료합니다."); fgets(line, sizeof(line), stdin); return; }
        }
    }
}

int main(int argc, char **argv) {
    CrosswordPuzzle puzzle; char error[256];
    if (argc != 3 || (strcmp(argv[1], "--validate") != 0 && strcmp(argv[1], "--summary") != 0 && strcmp(argv[1], "--play") != 0)) {
        fprintf(stderr, "usage: %s --validate|--summary|--play puzzle.json\n", argv[0]); return 2;
    }
    if (!crossword_load_file(argv[2], &puzzle, error, sizeof(error))) { fprintf(stderr, "crossword: %s\n", error[0] ? error : "invalid puzzle"); return 1; }
    if (strcmp(argv[1], "--summary") == 0) crossword_print_summary(&puzzle);
    else if (strcmp(argv[1], "--play") == 0) play(&puzzle);
    else printf("valid grid=10x10 clues=%zu\n", puzzle.clue_count);
    return 0;
}
