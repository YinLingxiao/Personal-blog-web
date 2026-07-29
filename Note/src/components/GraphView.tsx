import { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3';
import type { GraphData, GraphNode } from '../types';
import { graphConfig } from '../config';
import { useIsMobile } from '@/hooks/useMediaQuery';

/** Device-specific graph dimensions, kept in one place so the render code below
 *  stays free of scattered isMobile ternaries. Mobile = bigger touch targets,
 *  larger labels, and no glow filter (cheaper to paint). */
const SIZING = {
  desktop: { catMin: 16, catScale: 11, noteMin: 5, noteScale: 5.5, catFont: 13, noteFont: 11, glow: true },
  mobile: { catMin: 20, catScale: 13, noteMin: 8, noteScale: 6.5, catFont: 16, noteFont: 14, glow: false },
} as const;

interface Props {
  data: GraphData;
  onNodeClick: (id: string) => void;
  selectedNodeId?: string | null;
  scope?: string | null;
  onBack?: () => void;
}

const COLORS = [
  '#c8956c', '#d4a574', '#b8845e', '#a07050',
  '#c0a080', '#d09060', '#b09070', '#c8a888',
];

interface SimulationGraphNode extends GraphNode, SimulationNodeDatum {}

interface SimulationGraphLink extends SimulationLinkDatum<SimulationGraphNode> {
  source: string | SimulationGraphNode;
  target: string | SimulationGraphNode;
}

const isGhost = (node: SimulationGraphNode) => node.kind === 'ghost';
const isCategory = (node: SimulationGraphNode) => node.kind === 'category';
const endpointId = (endpoint: string | SimulationGraphNode) => typeof endpoint === 'string' ? endpoint : endpoint.id;
const endpointNode = (endpoint: string | SimulationGraphNode) => typeof endpoint === 'string' ? undefined : endpoint;

export default function GraphView({ data, onNodeClick, selectedNodeId, scope, onBack }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const stableClick = useCallback((id: string) => onNodeClick(id), [onNodeClick]);
  const isMobile = useIsMobile();
  const sizing = isMobile ? SIZING.mobile : SIZING.desktop;
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Track container size so the canvas re-fits on window resize / device rotation.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDimensions({ width, height });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svgEl = svgRef.current;
    const { width, height } = dimensions;
    if (!svgEl || data.nodes.length === 0 || width === 0 || height === 0) return;

    const svg = d3.select(svgEl).attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'blur');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.15, 5]).on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);

    const nodes: SimulationGraphNode[] = data.nodes.map((node) => ({ ...node }));
    const links: SimulationGraphLink[] = data.edges.map((edge) => ({ ...edge }));

    const sim = d3.forceSimulation<SimulationGraphNode>(nodes)
      .force('link', d3.forceLink<SimulationGraphNode, SimulationGraphLink>(links).id((node) => node.id).distance(160).strength(0.35))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<SimulationGraphNode>().radius((node) => nodeRadius(node) + 10))
      .force('x', d3.forceX(width / 2).strength(0.03))
      .force('y', d3.forceY(height / 2).strength(0.03));

    function nodeRadius(node: SimulationGraphNode) {
      if (isCategory(node)) return Math.max(sizing.catMin, Math.sqrt((node.count || 1)) * sizing.catScale);
      return Math.max(sizing.noteMin, Math.sqrt(node.linkCount + 1) * sizing.noteScale);
    }

    const link = g.append('g').selectAll('line').data(links).enter().append('line')
      .attr('stroke', 'rgba(200,149,108,0.12)')
      .attr('stroke-width', 1);

    const node = g.append('g').selectAll<SVGGElement, SimulationGraphNode>('g').data(nodes).enter().append('g')
      // desktop: hide cursor so the custom crosshair shows through; touch: native pointer
      .style('cursor', isMobile ? 'pointer' : 'none')
      .call(d3.drag<SVGGElement, SimulationGraphNode>()
        .on('start', (e) => { if (!e.active) sim.alphaTarget(0.3).restart(); e.subject.fx = e.subject.x; e.subject.fy = e.subject.y; })
        .on('drag', (e) => { e.subject.fx = e.x; e.subject.fy = e.y; })
        .on('end', (e) => { if (!e.active) sim.alphaTarget(0); e.subject.fx = null; e.subject.fy = null; }));

    node.append('circle')
      .attr('r', nodeRadius)
      .attr('fill', (node, index) => isGhost(node) ? 'none' : COLORS[index % COLORS.length])
      .attr('fill-opacity', (node) => isGhost(node) ? 0 : (isCategory(node) ? 0.85 : 0.7))
      .attr('stroke', (node) => isGhost(node) ? 'rgba(200,149,108,0.35)' : (node.id === selectedNodeId ? 'rgba(212,165,116,0.6)' : 'transparent'))
      .attr('stroke-width', (node) => isGhost(node) ? 1.2 : 2)
      .attr('stroke-dasharray', (node) => isGhost(node) ? '3 3' : 'none')
      .attr('filter', (node) => (isGhost(node) || !sizing.glow) ? null : 'url(#glow)');

    node.append('text')
      .text((node) => {
        const label = node.title.length > 14 ? `${node.title.slice(0, 13)}…` : node.title;
        return isCategory(node) ? `${label} (${node.count})` : label;
      })
      .attr('dx', (node) => nodeRadius(node) + 6)
      .attr('dy', 4)
      .attr('fill', (node) => isGhost(node) ? '#4a4a4a' : (isCategory(node) ? '#bbb' : '#777'))
      .attr('font-size', (node) => isCategory(node) ? `${sizing.catFont}px` : `${sizing.noteFont}px`)
      .attr('font-style', (node) => isGhost(node) ? 'italic' : 'normal')
      .attr('pointer-events', 'none');

    node.on('click', (_, selected) => { if (!isGhost(selected)) stableClick(selected.id); });

    node.on('mouseover', function (_, selected) {
      d3.select(this).select('circle').attr('fill-opacity', 1).attr('stroke', 'rgba(212,165,116,0.6)');
      link
        .attr('stroke', (edge) => endpointId(edge.source) === selected.id || endpointId(edge.target) === selected.id ? 'rgba(200,149,108,0.35)' : 'rgba(200,149,108,0.03)')
        .attr('stroke-width', (edge) => endpointId(edge.source) === selected.id || endpointId(edge.target) === selected.id ? 1.5 : 0.5);
      node.select('circle').attr('fill-opacity', (candidate) => {
        if (candidate.id === selected.id) return 1;
        return links.some((edge) => (endpointId(edge.source) === selected.id && endpointId(edge.target) === candidate.id) || (endpointId(edge.target) === selected.id && endpointId(edge.source) === candidate.id)) ? 0.8 : 0.15;
      });
      node.select('text').attr('fill-opacity', (candidate) => {
        if (candidate.id === selected.id) return 1;
        return links.some((edge) => (endpointId(edge.source) === selected.id && endpointId(edge.target) === candidate.id) || (endpointId(edge.target) === selected.id && endpointId(edge.source) === candidate.id)) ? 1 : 0.15;
      });
    });

    node.on('mouseout', () => {
      node.select('circle')
        .attr('fill-opacity', (candidate) => isGhost(candidate) ? 0 : (isCategory(candidate) ? 0.85 : 0.7))
        .attr('stroke', (candidate) => isGhost(candidate) ? 'rgba(200,149,108,0.35)' : (candidate.id === selectedNodeId ? 'rgba(212,165,116,0.6)' : 'transparent'));
      node.select('text').attr('fill-opacity', 1);
      link.attr('stroke', 'rgba(200,149,108,0.12)').attr('stroke-width', 1);
    });

    // Constrain nodes within SVG bounds to prevent clipping
    const padding = 30;
    sim.on('tick', () => {
      nodes.forEach((simulationNode) => {
        const radius = nodeRadius(simulationNode) + padding;
        simulationNode.x = Math.max(radius, Math.min(width - radius, simulationNode.x ?? width / 2));
        simulationNode.y = Math.max(radius, Math.min(height - radius, simulationNode.y ?? height / 2));
      });
      link
        .attr('x1', (edge) => endpointNode(edge.source)?.x ?? 0)
        .attr('y1', (edge) => endpointNode(edge.source)?.y ?? 0)
        .attr('x2', (edge) => endpointNode(edge.target)?.x ?? 0)
        .attr('y2', (edge) => endpointNode(edge.target)?.y ?? 0);
      node.attr('transform', (simulationNode) => `translate(${simulationNode.x ?? 0},${simulationNode.y ?? 0})`);
    });

    return () => { sim.stop(); };
  }, [data, stableClick, selectedNodeId, dimensions, sizing, isMobile]);

  const noteCount = data.nodes.filter((n) => n.kind !== 'ghost' && n.kind !== 'category').length;
  const catCount = data.nodes.filter((n) => n.kind === 'category').length;

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg ref={svgRef} className="w-full h-full" style={{ touchAction: 'none' }} />

      {/* Breadcrumb / drill-down context */}
      <div className="absolute top-4 left-4 z-10 text-xs">
        {scope ? (
          <span className="liquid-glass rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5">
            <button onClick={onBack} className="relative z-10 text-[#888] hover:text-[#ddd] transition-colors">
              ← {graphConfig.backToOverviewLabel}
            </button>
            <span className="relative z-10 text-[#444]">/</span>
            <span className="relative z-10 text-[#bbb]">{scope}</span>
          </span>
        ) : (
          <span className="text-[#555] font-serif-cn">{graphConfig.overviewHint}</span>
        )}
      </div>

      <div className="liquid-glass absolute bottom-10 left-4 rounded-xl px-4 py-2.5 w-fit">
        <div className="relative z-10 text-xs text-[#666] space-y-0.5">
          {scope ? (
            <div><span className="text-[#999]">{noteCount}</span> {graphConfig.notesLabel} · <span className="text-[#999]">{data.edges.length}</span> {graphConfig.connectionsLabel}</div>
          ) : (
            <div><span className="text-[#999]">{catCount}</span> {graphConfig.categoriesLabel}</div>
          )}
        </div>
      </div>

      {data.nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-[#333] text-sm">{graphConfig.emptyGraphLabel}</div>
      )}
    </div>
  );
}
