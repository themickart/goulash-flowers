/* Original 32 × 32 artwork for the sign's existing round LED matrix.
   Each cell is one diode; these shapes are rasterized once at module load. */

export const LED_COLORS = {
    p: '#ff4f93', P: '#b82d66', h: '#ffacce',
    r: '#ff7166', R: '#cb414e', y: '#ffda73', o: '#ffa951',
    g: '#b1ec52', G: '#58964c', m: '#7ce0af',
    w: '#fff3df', W: '#dcb89a', k: '#d9a066', K: '#9b674e',
    c: '#00ffff', C: '#238e9d', v: '#593653',
};

function sprite(paint) {
    const grid = Array.from({ length: 32 }, () => Array(32).fill('.'));
    const dot = (x, y, color) => {
        if (x >= 0 && x < 32 && y >= 0 && y < 32) grid[y][x] = color;
    };
    const ellipse = (cx, cy, rx, ry, color) => {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
            for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
                if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) dot(x, y, color);
    };
    const line = (x1, y1, x2, y2, color, width = 1) => {
        const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
        for (let i = 0; i <= steps; i++) {
            const x = Math.round(x1 + (x2 - x1) * i / (steps || 1));
            const y = Math.round(y1 + (y2 - y1) * i / (steps || 1));
            for (let oy = 0; oy < width; oy++)
                for (let ox = 0; ox < width; ox++) dot(x + ox, y + oy, color);
        }
    };
    const polygon = (points, color) => {
        for (let y = 0; y < 32; y++) {
            for (let x = 0; x < 32; x++) {
                let inside = false;
                for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                    const [ax, ay] = points[i], [bx, by] = points[j];
                    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
                }
                if (inside) dot(x, y, color);
            }
        }
    };
    const ring = (cx, cy, radius, color) => {
        for (let y = cy - radius; y <= cy + radius; y++)
            for (let x = cx - radius; x <= cx + radius; x++) {
                const d = Math.hypot(x - cx, y - cy);
                if (d >= radius - .8 && d <= radius + .3) dot(x, y, color);
            }
    };
    paint({ dot, ellipse, line, polygon, ring });
    return grid.map(row => row.join(''));
}

const anemone = sprite(({ dot, ellipse, line, polygon }) => {
    // A broad, scalloped pink flower with a dark seed head and two swept leaves.
    line(16, 16, 17, 30, 'G', 2);
    line(16, 18, 17, 29, 'g');
    polygon([[16, 27], [9, 28], [5, 21], [11, 22], [16, 26]], 'G');
    polygon([[16, 27], [8, 23], [6, 21], [12, 23]], 'g');
    polygon([[18, 25], [20, 19], [27, 18], [25, 24], [18, 27]], 'G');
    line(19, 25, 25, 20, 'm');
    const petals = [[15, 4, 4, 3], [21, 6, 4, 4], [24, 11, 4, 3],
        [21, 16, 4, 4], [15, 17, 4, 3], [9, 15, 4, 4], [7, 10, 4, 3], [10, 5, 4, 4]];
    petals.forEach(([x, y, rx, ry]) => ellipse(x, y, rx, ry, 'P'));
    petals.forEach(([x, y, rx, ry]) => ellipse(x, y - 1, rx - .5, ry - .6, 'p'));
    line(12, 2, 15, 2, 'h'); line(8, 4, 7, 6, 'h');
    line(21, 3, 23, 5, 'h'); line(25, 9, 27, 10, 'h');
    line(6, 10, 5, 12, 'h'); line(10, 16, 12, 17, 'h');
    ellipse(15.5, 10.5, 5, 5, 'v');
    [[14, 6], [17, 6], [19, 8], [20, 11], [18, 14], [15, 15], [12, 13], [11, 10], [12, 8]].forEach(([x, y]) => dot(x, y, 'y'));
    [[14, 9], [17, 9], [15, 12], [17, 12]].forEach(([x, y]) => dot(x, y, 'h'));
});

const bouquet = sprite(({ dot, ellipse, line, polygon }) => {
    // Three different blossoms, fan-shaped foliage, folded paper and a bow.
    polygon([[7, 18], [2, 11], [7, 12], [12, 19]], 'G');
    polygon([[22, 19], [26, 11], [30, 12], [25, 20]], 'm');
    line(8, 10, 16, 27, 'g'); line(16, 6, 16, 27, 'm'); line(24, 11, 17, 27, 'g');
    const flower = (cx, cy, petal, light, center) => {
        ellipse(cx, cy - 3, 2, 2, petal); ellipse(cx - 3, cy, 2, 2, petal);
        ellipse(cx + 3, cy, 2, 2, petal); ellipse(cx - 2, cy + 3, 2, 2, petal);
        ellipse(cx + 2, cy + 3, 2, 2, petal); ellipse(cx, cy, 3, 3, petal);
        dot(cx - 1, cy - 4, light); dot(cx - 4, cy - 1, light); dot(cx + 2, cy - 2, light);
        ellipse(cx, cy, 1.5, 1.5, center);
    };
    flower(7, 10, 'p', 'h', 'y');
    flower(16, 6, 'w', 'y', 'o');
    flower(25, 11, 'r', 'y', 'P');
    polygon([[3, 18], [16, 21], [28, 17], [23, 26], [17, 31], [11, 29]], 'k');
    polygon([[3, 18], [16, 21], [17, 30], [11, 28]], 'w');
    polygon([[28, 17], [17, 22], [20, 28], [24, 24]], 'W');
    line(16, 22, 17, 29, 'K');
    ellipse(13, 24, 3, 2, 'p'); ellipse(20, 23, 3, 2, 'p');
    ellipse(13, 24, 1, 1, 'P'); ellipse(20, 23, 1, 1, 'P');
    line(16, 24, 14, 28, 'p'); line(17, 24, 21, 27, 'p');
    dot(16, 24, 'h'); dot(17, 24, 'h');
});

const tulips = sprite(({ dot, line, polygon }) => {
    // An asymmetric trio of cup-shaped tulips, rather than the previous single stem.
    line(7, 16, 13, 29, 'G', 2); line(17, 11, 16, 30, 'g', 2); line(26, 16, 19, 30, 'm');
    polygon([[14, 29], [6, 26], [3, 19], [9, 22], [14, 28]], 'g');
    polygon([[18, 29], [22, 21], [29, 19], [26, 26]], 'G');
    line(19, 28, 26, 22, 'm');
    polygon([[14, 27], [12, 19], [14, 16], [16, 24], [16, 29]], 'G');
    polygon([[2, 8], [5, 10], [7, 6], [9, 10], [12, 8], [12, 13], [9, 17], [5, 17], [2, 13]], 'P');
    polygon([[2, 8], [5, 10], [7, 6], [8, 11], [11, 9], [10, 14], [7, 16], [4, 13]], 'p');
    line(4, 10, 4, 12, 'h'); dot(5, 14, 'h');
    polygon([[12, 2], [15, 5], [17, 1], [19, 5], [22, 2], [21, 9], [18, 13], [15, 12], [12, 8]], 'R');
    polygon([[12, 2], [15, 5], [17, 1], [18, 7], [21, 4], [19, 10], [16, 11], [13, 8]], 'r');
    line(14, 5, 14, 8, 'y'); dot(15, 10, 'o');
    polygon([[21, 9], [24, 11], [26, 7], [28, 11], [31, 8], [30, 14], [27, 18], [24, 17], [21, 13]], 'p');
    polygon([[21, 9], [24, 11], [26, 7], [27, 12], [30, 10], [28, 15], [25, 16], [22, 13]], 'h');
    line(24, 12, 24, 14, 'w');
});

const courier = sprite(({ dot, ellipse, line, polygon, ring }) => {
    // A helmeted rider leaning into the handlebars, with a flower parcel behind.
    ring(7, 25, 5, 'w'); ring(25, 25, 5, 'w');
    dot(7, 25, 'c'); dot(25, 25, 'c');
    line(7, 25, 12, 17, 'c'); line(12, 17, 19, 25, 'c');
    line(7, 25, 19, 25, 'c'); line(12, 17, 22, 17, 'C'); line(19, 25, 22, 17, 'c');
    line(23, 14, 25, 25, 'c'); line(23, 14, 27, 14, 'w');
    line(10, 17, 14, 17, 'w'); line(2, 19, 10, 19, 'C');
    // Kraft delivery box and a small pink bloom above it.
    polygon([[1, 12], [10, 12], [10, 20], [1, 20]], 'k');
    line(1, 12, 9, 12, 'w'); line(8, 13, 8, 18, 'K'); line(3, 16, 6, 16, 'w');
    line(5, 9, 5, 12, 'g'); dot(3, 10, 'g'); dot(6, 10, 'm');
    ellipse(5, 8, 2, 2, 'p'); dot(5, 8, 'y'); dot(4, 6, 'h');
    // Rear leg, forward leg and reflective shoes.
    line(15, 16, 12, 21, 'C', 2); line(12, 21, 16, 24, 'C'); line(15, 24, 18, 24, 'w');
    line(15, 16, 20, 20, 'w', 2); line(20, 20, 18, 25, 'W'); line(17, 26, 20, 26, 'p');
    // Jacket, reaching arm, neck and face in profile.
    polygon([[16, 8], [20, 10], [18, 15], [15, 18], [12, 15], [14, 10]], 'C');
    polygon([[16, 8], [19, 10], [16, 15], [13, 14], [15, 10]], 'c');
    line(19, 10, 21, 13, 'c', 2); line(21, 14, 25, 14, 'w');
    line(18, 7, 18, 9, 'w');
    ellipse(18, 2.5, 3, 2, 'P');
    ellipse(18, 2, 2.5, 1.8, 'p'); line(16, 1, 18, 1, 'h');
    polygon([[18, 4], [21, 4], [21, 5], [23, 6], [21, 7], [18, 7]], 'w');
    dot(21, 5, 'v');
    line(19, 4, 22, 4, 'p');
});

export const SPRITES = { anemone, bouquet, tulips, courier };
export const FLOWER_ORDER = ['anemone', 'bouquet', 'tulips'];
