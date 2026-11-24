package com.instascan.warranty.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Palette from Draft Img/Colour Scheme.png
val Blush = Color(0xFFF5E6E8)
val Lavender = Color(0xFFD5C6E0)
val Periwinkle = Color(0xFFAAA1C8)
val Mauve = Color(0xFF967AA1)
val Navy = Color(0xFF192A51)

// Text and icons always sit on Navy-on-light or Blush-on-Navy pairs for readable contrast.
private val InstaPayColors = lightColorScheme(
    primary = Navy,
    onPrimary = Blush,
    primaryContainer = Lavender,
    onPrimaryContainer = Navy,
    secondary = Mauve,
    onSecondary = Color.White,
    secondaryContainer = Periwinkle,
    onSecondaryContainer = Navy,
    tertiary = Mauve,
    onTertiary = Color.White,
    background = Blush,
    onBackground = Navy,
    surface = Blush,
    onSurface = Navy,
    surfaceVariant = Lavender,
    onSurfaceVariant = Navy,
    surfaceContainer = Lavender,
    surfaceContainerHigh = Lavender,
    surfaceContainerHighest = Lavender,
    outline = Mauve,
    outlineVariant = Periwinkle,
)

@Composable
fun InstaPayTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = InstaPayColors, content = content)
}
