#ifndef KOREAN_CROSSWORD_H
#define KOREAN_CROSSWORD_H

#include <stddef.h>
#include <stdint.h>

#define CROSSWORD_GRID_SIZE 10
#define CROSSWORD_MAX_CLUES 64
#define CROSSWORD_MAX_ANSWER 64

typedef enum {
    CROSSWORD_ACROSS = 0,
    CROSSWORD_DOWN = 1
} CrosswordDirection;

typedef struct {
    int number;
    CrosswordDirection direction;
    int row;
    int col;
    char answer[CROSSWORD_MAX_ANSWER];
    char clue[2048];
    char definition[1024];
    char article_url[512];
    uint32_t letters[CROSSWORD_MAX_ANSWER];
    size_t letter_count;
} CrosswordClue;

typedef struct {
    CrosswordClue clues[CROSSWORD_MAX_CLUES];
    size_t clue_count;
    uint32_t letters[CROSSWORD_GRID_SIZE][CROSSWORD_GRID_SIZE];
    uint8_t across_numbers[CROSSWORD_GRID_SIZE][CROSSWORD_GRID_SIZE];
    uint8_t down_numbers[CROSSWORD_GRID_SIZE][CROSSWORD_GRID_SIZE];
    uint8_t occupied[CROSSWORD_GRID_SIZE][CROSSWORD_GRID_SIZE];
} CrosswordPuzzle;

int crossword_load_file(const char *path, CrosswordPuzzle *out,
                        char *error, size_t error_size);
int crossword_load_payload(const char *payload, size_t payload_size,
                           CrosswordPuzzle *out, char *error,
                           size_t error_size);
int crossword_validate(const CrosswordPuzzle *puzzle, char *error,
                       size_t error_size);
void crossword_print_summary(const CrosswordPuzzle *puzzle);
void crossword_free(CrosswordPuzzle *puzzle);

#endif
