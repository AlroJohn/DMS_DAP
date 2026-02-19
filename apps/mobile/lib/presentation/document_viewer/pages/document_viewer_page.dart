import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:pdfx/pdfx.dart';

import '../../../data/datasources/remote/document_files_remote.dart';
import '../../../data/datasources/remote/document_signing_remote.dart';
import '../../../data/datasources/remote/document_stream_remote.dart';
import '../../../data/dto/signature_placeholder_dto.dart';
import '../../../data/dto/text_placeholder_dto.dart';
import '../../../domain/entities/pending_signature_document.dart';
import '../../auth/cubit/auth_cubit.dart';
import '../document_viewer_cubit.dart';
import '../signing_cubit.dart';
import '../widgets/signature_capture_modal.dart';
import '../widgets/text_placeholder_modal.dart';

/// In-app document viewer. Displays PDF from stream API; supports loading, error, and retry.
class DocumentViewerPage extends StatelessWidget {
  const DocumentViewerPage({
    super.key,
    required this.documentId,
    required this.documentName,
    required this.files,
    this.isSignMode = true,
  });

  final String documentId;
  final String documentName;
  final List<DocumentFileInfo> files;
  final bool isSignMode;

  @override
  Widget build(BuildContext context) {
    final streamRemote = context.read<DocumentStreamRemote>();
    final filesRemote = context.read<DocumentFilesRemote>();

    return BlocProvider<DocumentViewerCubit>(
      create: (_) => DocumentViewerCubit(
        documentStreamRemote: streamRemote,
        documentFilesRemote: filesRemote,
      )..load(documentId: documentId, files: files),
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            documentName,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        body: BlocBuilder<DocumentViewerCubit, DocumentViewerState>(
          builder: (context, state) {
            if (state is DocumentViewerInitial || state is DocumentViewerLoading) {
              return const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text('Loading document...'),
                  ],
                ),
              );
            }
            if (state is DocumentViewerNoFile) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.description_outlined,
                        size: 64,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No document file available',
                        style: Theme.of(context).textTheme.titleMedium,
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              );
            }
            if (state is DocumentViewerError) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 64,
                        color: Theme.of(context).colorScheme.error,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        state.message,
                        style: Theme.of(context).textTheme.bodyLarge,
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      FilledButton.icon(
                        onPressed: () => context.read<DocumentViewerCubit>().load(
                              documentId: documentId,
                              files: files,
                            ),
                        icon: const Icon(Icons.refresh),
                        label: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              );
            }
            if (state is DocumentViewerLoaded) {
              if (isSignMode) {
                final signingRemote = context.read<DocumentSigningRemote>();
                return BlocProvider<SigningCubit>(
                  create: (_) => SigningCubit(signingRemote)..loadPlaceholders(documentId),
                  child: _SignModeContent(
                    documentId: documentId,
                    viewerState: state,
                  ),
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (state.files.length > 1) _FileSelectionBar(state: state),
                  Expanded(
                    child: _PdfViewerContent(
                      bytes: state.bytes,
                      files: state.files,
                      currentFileId: state.currentFileId,
                      onPageChanged: null,
                    ),
                  ),
                ],
              );
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }
}

/// Sign mode: PDF + placeholders list for current page + Confirm.
class _SignModeContent extends StatefulWidget {
  const _SignModeContent({
    required this.documentId,
    required this.viewerState,
  });

  final String documentId;
  final DocumentViewerLoaded viewerState;

  @override
  State<_SignModeContent> createState() => _SignModeContentState();
}

class _SignModeContentState extends State<_SignModeContent> {
  int _currentPage = 1;

  @override
  Widget build(BuildContext context) {
    final viewerState = widget.viewerState;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (viewerState.files.length > 1) _FileSelectionBar(state: viewerState),
        Expanded(
          child: BlocBuilder<SigningCubit, SigningState>(
            buildWhen: (prev, curr) => curr is SigningReady || prev is SigningReady,
            builder: (context, signingState) {
              return _PdfViewerContent(
                bytes: viewerState.bytes,
                files: viewerState.files,
                currentFileId: viewerState.currentFileId,
                onPageChanged: (page) => setState(() => _currentPage = page),
                signOverlay: signingState is SigningReady ? signingState : null,
              );
            },
          ),
        ),
        BlocBuilder<SigningCubit, SigningState>(
          builder: (context, signingState) {
            if (signingState is SigningLoading) {
              return const Padding(
                padding: EdgeInsets.all(8),
                child: Center(child: SizedBox(height: 24, width: 24, child: CircularProgressIndicator())),
              );
            }
            if (signingState is SigningError) {
              return Padding(
                padding: const EdgeInsets.all(8),
                child: Text(signingState.message, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              );
            }
            if (signingState is SigningReady) {
              return _PlaceholderList(
                currentPage: _currentPage,
                currentFileId: viewerState.currentFileId,
                signingState: signingState,
                onConfirm: () => _onConfirm(context, viewerState, signingState),
              );
            }
            if (signingState is SigningSubmitting) {
              return const Padding(
                padding: EdgeInsets.all(8),
                child: Center(child: CircularProgressIndicator()),
              );
            }
            if (signingState is SigningSubmitSuccess) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Signatures saved.')));
                  Navigator.of(context).pop();
                }
              });
            }
            return const SizedBox.shrink();
          },
        ),
      ],
    );
  }

  Future<void> _onConfirm(
    BuildContext context,
    DocumentViewerLoaded viewerState,
    SigningReady signingState,
  ) async {
    final authState = context.read<AuthCubit>().state;
    if (authState is! AuthAuthenticated) return;
    final selectedIds = viewerState.selectedFileIds.isEmpty
        ? viewerState.files.map((f) => f.fileId).toSet()
        : viewerState.selectedFileIds;
    await context.read<SigningCubit>().submit(
          documentId: widget.documentId,
          signeeId: authState.user.id,
          selectedFileIds: selectedIds,
        );
  }
}

/// List of placeholders for current page with Sign / Enter text actions.
class _PlaceholderList extends StatelessWidget {
  const _PlaceholderList({
    required this.currentPage,
    required this.currentFileId,
    required this.signingState,
    required this.onConfirm,
  });

  final int currentPage;
  final String currentFileId;
  final SigningReady signingState;
  final VoidCallback onConfirm;

  @override
  Widget build(BuildContext context) {
    final sigPlaceholders = signingState.signaturePlaceholders
        .where((p) => p.documentFileId == currentFileId && p.pageNumber == currentPage)
        .toList();
    final textPlaceholders = signingState.textPlaceholders
        .where((p) => p.documentFileId == currentFileId && p.pageNumber == currentPage)
        .toList();
    final hasAny = sigPlaceholders.isNotEmpty || textPlaceholders.isNotEmpty;

    return Material(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (hasAny) ...[
              Text(
                'Page $currentPage – Sign here',
                style: Theme.of(context).textTheme.labelLarge,
              ),
              const SizedBox(height: 4),
              ...sigPlaceholders.map((p) {
                final hasSignature = signingState.placedSignatures.containsKey(p.placeholderId);
                return ListTile(
                  dense: true,
                  leading: Icon(hasSignature ? Icons.check_circle : Icons.draw),
                  title: Text(hasSignature ? 'Signed' : 'Sign here'),
                  onTap: () async {
                    final dataUrl = await SignatureCaptureModal.show(context);
                    if (dataUrl != null && context.mounted) {
                      context.read<SigningCubit>().setSignature(p.placeholderId, dataUrl);
                    }
                  },
                );
              }),
              ...textPlaceholders.map((p) {
                final value = signingState.textValues[p.placeholderId] ?? p.textValue ?? '';
                return ListTile(
                  dense: true,
                  leading: const Icon(Icons.text_fields),
                  title: Text(value.isEmpty ? 'Enter text' : value),
                  onTap: () async {
                    final result = await TextPlaceholderModal.show(
                      context,
                      initialValue: value,
                      hint: 'Text for this field',
                    );
                    if (result != null && context.mounted) {
                      context.read<SigningCubit>().setTextValue(p.placeholderId, result);
                    }
                  },
                );
              }),
              const SizedBox(height: 8),
            ],
            FilledButton(
              onPressed: onConfirm,
              child: const Text('Confirm entries'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Selection bar: "Selected X of Y", Select all, Deselect all, and file switcher.
class _FileSelectionBar extends StatelessWidget {
  const _FileSelectionBar({required this.state});

  final DocumentViewerLoaded state;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<DocumentViewerCubit>();
    final theme = Theme.of(context);
    return Material(
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Text(
                  'Selected ${state.selectedFileIds.length} of ${state.files.length}',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(width: 12),
                TextButton(
                  onPressed: cubit.selectAll,
                  child: const Text('Select all'),
                ),
                TextButton(
                  onPressed: cubit.deselectAll,
                  child: const Text('Deselect all'),
                ),
              ],
            ),
            const SizedBox(height: 4),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: state.files.map((f) {
                  final isSelected = state.selectedFileIds.contains(f.fileId);
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(
                        f.fileName,
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                      selected: isSelected,
                      selectedColor: theme.colorScheme.primaryContainer,
                      showCheckmark: true,
                      onSelected: (_) => cubit.toggleFileSelection(f.fileId),
                    ),
                  );
                }).toList(),
              ),
            ),
            if (state.files.length > 1)
              DropdownButton<String>(
                value: state.currentFileId,
                isExpanded: true,
                items: state.files
                    .map((f) => DropdownMenuItem(
                          value: f.fileId,
                          child: Text(
                            f.fileName,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ))
                    .toList(),
                onChanged: (id) {
                  if (id != null) cubit.loadFile(id);
                },
              ),
          ],
        ),
      ),
    );
  }
}

/// Creates [PdfController] from bytes and disposes it. Must be stateful for lifecycle.
class _PdfViewerContent extends StatefulWidget {
  const _PdfViewerContent({
    required this.bytes,
    required this.files,
    required this.currentFileId,
    this.onPageChanged,
    this.signOverlay,
  });

  final Uint8List bytes;
  final List<DocumentFileInfo> files;
  final String currentFileId;
  final void Function(int page)? onPageChanged;
  /// When non-null, placeholders are overlaid on each page (sign mode).
  final SigningReady? signOverlay;

  @override
  State<_PdfViewerContent> createState() => _PdfViewerContentState();
}

class _PdfViewerContentState extends State<_PdfViewerContent> {
  late PdfController _controller;

  @override
  void initState() {
    super.initState();
    _controller = PdfController(
      document: PdfDocument.openData(widget.bytes),
    );
  }

  @override
  void didUpdateWidget(_PdfViewerContent oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.bytes != widget.bytes || oldWidget.currentFileId != widget.currentFileId) {
      _controller.dispose();
      _controller = PdfController(
        document: PdfDocument.openData(widget.bytes),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  static const double _defaultPageWidth = 612;
  static const double _defaultPageHeight = 792;

  PhotoViewGalleryPageOptions _buildPageWithOverlay(
    BuildContext context,
    Future<PdfPageImage> pageImageFuture,
    int index,
    PdfDocument document,
    SigningReady signOverlay,
    String currentFileId,
  ) {
    return PhotoViewGalleryPageOptions.customChild(
      childSize: const Size(_defaultPageWidth, _defaultPageHeight),
      child: FutureBuilder<PdfPageImage>(
        future: pageImageFuture,
        builder: (context, imageSnap) {
          if (!imageSnap.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final image = imageSnap.data!;
          return FutureBuilder<PdfPage>(
            future: document.getPage(index + 1),
            builder: (context, pageSnap) {
              if (!pageSnap.hasData) {
                return _buildPageImage(image);
              }
              final pdfPage = pageSnap.data!;
              final scaleX = _defaultPageWidth / pdfPage.width;
              final scaleY = _defaultPageHeight / pdfPage.height;
              final sigList = signOverlay.signaturePlaceholders
                  .where((p) =>
                      p.documentFileId == currentFileId &&
                      p.pageNumber == index + 1)
                  .toList();
              final textList = signOverlay.textPlaceholders
                  .where((p) =>
                      p.documentFileId == currentFileId &&
                      p.pageNumber == index + 1)
                  .toList();
              return Stack(
                fit: StackFit.expand,
                children: [
                  _buildPageImage(image),
                  Positioned.fill(
                    child: _PlaceholderOverlay(
                      scaleX: scaleX,
                      scaleY: scaleY,
                      displayWidth: _defaultPageWidth,
                      displayHeight: _defaultPageHeight,
                      signaturePlaceholders: sigList,
                      textPlaceholders: textList,
                      placedSignatures: signOverlay.placedSignatures,
                      textValues: signOverlay.textValues,
                    ),
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildPageImage(PdfPageImage image) {
    return SizedBox(
      width: _defaultPageWidth,
      height: _defaultPageHeight,
      child: Image.memory(
        image.bytes,
        width: _defaultPageWidth,
        height: _defaultPageHeight,
        fit: BoxFit.fill,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final signOverlay = widget.signOverlay;
    return PdfView(
      controller: _controller,
      onPageChanged: widget.onPageChanged,
      builders: signOverlay != null
          ? PdfViewBuilders<DefaultBuilderOptions>(
              options: const DefaultBuilderOptions(),
              documentLoaderBuilder: (_) =>
                  const Center(child: CircularProgressIndicator()),
              pageLoaderBuilder: (_) =>
                  const Center(child: CircularProgressIndicator()),
              errorBuilder: (_, error) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    error.toString(),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
              pageBuilder: (context, pageImage, index, document) =>
                  _buildPageWithOverlay(
                context,
                pageImage,
                index,
                document,
                signOverlay,
                widget.currentFileId,
              ),
            )
          : PdfViewBuilders<DefaultBuilderOptions>(
              options: const DefaultBuilderOptions(),
              documentLoaderBuilder: (_) =>
                  const Center(child: CircularProgressIndicator()),
              pageLoaderBuilder: (_) =>
                  const Center(child: CircularProgressIndicator()),
              errorBuilder: (_, error) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    error.toString(),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
            ),
    );
  }
}

/// Overlay of signature and text placeholder boxes on a PDF page (sign mode).
class _PlaceholderOverlay extends StatelessWidget {
  const _PlaceholderOverlay({
    required this.scaleX,
    required this.scaleY,
    required this.displayWidth,
    required this.displayHeight,
    required this.signaturePlaceholders,
    required this.textPlaceholders,
    required this.placedSignatures,
    required this.textValues,
  });

  final double scaleX;
  final double scaleY;
  final double displayWidth;
  final double displayHeight;
  final List<SignaturePlaceholderDto> signaturePlaceholders;
  final List<TextPlaceholderDto> textPlaceholders;
  final Map<String, String> placedSignatures;
  final Map<String, String> textValues;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Stack(
      clipBehavior: Clip.none,
      children: [
        ...signaturePlaceholders.map((p) {
          final left = p.xPosition * scaleX;
          final top = p.yPosition * scaleY;
          final w = p.width * scaleX;
          final h = p.height * scaleY;
          final dataUrl = placedSignatures[p.placeholderId];
          return Positioned(
            left: left,
            top: top,
            width: w,
            height: h,
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () async {
                  final dataUrl = await SignatureCaptureModal.show(context);
                  if (dataUrl != null && context.mounted) {
                    context.read<SigningCubit>().setSignature(p.placeholderId, dataUrl);
                  }
                },
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: theme.colorScheme.primary,
                      width: 2,
                    ),
                  ),
                  child: dataUrl != null && dataUrl.startsWith('data:image')
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: Image.memory(
                            base64Decode(dataUrl.split(',').last),
                            fit: BoxFit.contain,
                          ),
                        )
                      : Center(
                          child: Text(
                            'Signature',
                            style: theme.textTheme.labelMedium?.copyWith(
                              color: theme.colorScheme.primary,
                            ),
                          ),
                        ),
                ),
              ),
            ),
          );
        }),
        ...textPlaceholders.map((p) {
          final left = p.xPosition * scaleX;
          final top = p.yPosition * scaleY;
          final w = p.width * scaleX;
          final h = p.height * scaleY;
          final value =
              textValues[p.placeholderId] ?? p.textValue ?? 'Text';
          return Positioned(
            left: left,
            top: top,
            width: w,
            height: h,
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () async {
                  final result = await TextPlaceholderModal.show(
                    context,
                    initialValue: value == 'Text' ? '' : value,
                    hint: 'Text for this field',
                  );
                  if (result != null && context.mounted) {
                    context.read<SigningCubit>().setTextValue(p.placeholderId, result);
                  }
                },
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: CustomPaint(
                    painter: _DashedBorderPainter(color: Colors.orange),
                    child: Center(
                      child: Text(
                        value,
                        style: theme.textTheme.bodySmall,
                        textAlign: TextAlign.center,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
        }),
      ],
    );
  }
}

/// Paints a dashed border (used for text placeholder when Border doesn't support dash).
class _DashedBorderPainter extends CustomPainter {
  _DashedBorderPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    const dashWidth = 4.0;
    const dashSpace = 3.0;
    double startX = 0;
    while (startX < size.width) {
      canvas.drawLine(
        Offset(startX, 0),
        Offset(startX + dashWidth, 0),
        paint,
      );
      startX += dashWidth + dashSpace;
    }
    startX = 0;
    while (startX < size.width) {
      canvas.drawLine(
        Offset(startX, size.height),
        Offset(startX + dashWidth, size.height),
        paint,
      );
      startX += dashWidth + dashSpace;
    }
    double startY = 0;
    while (startY < size.height) {
      canvas.drawLine(
        Offset(0, startY),
        Offset(0, startY + dashWidth),
        paint,
      );
      startY += dashWidth + dashSpace;
    }
    startY = 0;
    while (startY < size.height) {
      canvas.drawLine(
        Offset(size.width, startY),
        Offset(size.width, startY + dashWidth),
        paint,
      );
      startY += dashWidth + dashSpace;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
