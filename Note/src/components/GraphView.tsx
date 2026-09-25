import { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3';
import type { GraphData, GraphNode } from '../types';
import { graphConfig } from '../config';
import { useMotionPolicy } from './motion/motion';

interface Props {
  data: GraphData;
  onNodeClick: (id: string) => void;
  selectedNodeId?: string | null;
  scope?: string | null;
  onBack?: () => void;
}
interface Node extends GraphNode, SimulationNodeDatum {}
interface Edge extends SimulationLinkDatum<Node> { source: string | Node; target: string | Node }
const endpoint = (n: string | Node) => typeof n === 'string' ? n : n.id;
const ghost = (n: GraphNode) => n.kind === 'ghost';
const category = (n: GraphNode) => n.kind === 'category';

export default function GraphView({ data, onNodeClick, selectedNodeId, scope, onBack }: Props) {
  const containerRef = useRef<HTMLDivElement>(null), svgRef = useRef<SVGSVGElement>(null);
  const action = useRef(onNodeClick);
  const selection = useRef(selectedNodeId);
  const emphasize = useRef<(id?: string | null) => void>(() => {});
  const controls = useRef<(scale: number | null) => void>(() => {});
  const { reduced } = useMotionPolicy();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  useEffect(() => { action.current = onNodeClick; }, [onNodeClick]);
  useEffect(() => { selection.current = selectedNodeId; emphasize.current(selectedNodeId); }, [selectedNodeId]);
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDimensions(previous => previous.width === width && previous.height === height ? previous : { width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const el = svgRef.current;
    const { width, height } = dimensions;
    if (!el || !width || !height) return;
    const svg = d3.select(el).attr('viewBox', `0 0 ${width} ${height}`);
    svg.selectAll('*').remove();
    const group = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([.2, 5]).on('zoom', e => group.attr('transform', e.transform));
    svg.call(zoom).on('dblclick.zoom', null);
    controls.current = value => {
      if (value === null) svg.call(zoom.transform, d3.zoomIdentity);
      else svg.call(zoom.scaleBy, value);
    };
    const nodes: Node[] = data.nodes.map((n, i) => ({ ...n, x: width / 2 + Math.cos(i * 2.399) * Math.sqrt(i + 1) * 30, y: height / 2 + Math.sin(i * 2.399) * Math.sqrt(i + 1) * 25 }));
    const edges: Edge[] = data.edges.map(e => ({ ...e }));
    const neighbors = new Map(nodes.map(n => [n.id, new Set([n.id])]));
    edges.forEach(e => { neighbors.get(endpoint(e.source))?.add(endpoint(e.target)); neighbors.get(endpoint(e.target))?.add(endpoint(e.source)); });
    const radius = (n: Node) => category(n) ? Math.min(45, 15 + Math.sqrt(n.count || 1) * 3) : Math.min(17, 5 + Math.sqrt(n.linkCount + 1) * 2);
    const simulation = d3.forceSimulation(nodes).alphaDecay(.045).velocityDecay(.4)
      .force('link', d3.forceLink<Node, Edge>(edges).id(n => n.id).distance(125).strength(.3))
      .force('charge', d3.forceManyBody().strength(-260))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<Node>().radius(n => radius(n) + 18))
      .force('x', d3.forceX(width / 2).strength(.035)).force('y', d3.forceY(height / 2).strength(.035));
    const lines = group.append('g').attr('aria-hidden', 'true').selectAll('line').data(edges).join('line').attr('stroke', '#777').attr('stroke-opacity', .24).attr('stroke-width', 1);
    const node = group.append('g').selectAll<SVGGElement, Node>('g').data(nodes).join('g')
      .attr('class', 'graph-node').attr('data-kind', n => n.kind || 'note').style('pointer-events', 'bounding-box')
      .attr('tabindex', n => ghost(n) ? null : 0).attr('role', n => ghost(n) ? 'img' : 'button')
      .attr('aria-label', n => `${n.title}${ghost(n) ? '，未解析链接' : category(n) ? `，${n.count} 篇笔记，打开分类` : '，打开笔记'}`)
      .style('cursor', n => ghost(n) ? 'default' : 'pointer');
    node.append('circle').attr('r', n => Math.max(22, radius(n) + 6)).attr('fill', 'transparent');
    node.append('circle').attr('class', 'node-outline').attr('r', radius)
      .attr('fill', n => ghost(n) || category(n) ? '#080808' : '#d3d0c8')
      .attr('stroke', n => ghost(n) ? '#a09e97' : '#cac7be').attr('stroke-width', 1)
      .attr('stroke-dasharray', n => ghost(n) ? '3 3' : null);
    node.filter(category).append('circle').attr('r', n => radius(n) - 5).attr('fill', 'none').attr('stroke', '#8f8b82').attr('stroke-width', 1);
    const labelLimit = width < 600 ? 7 : 15;
    node.append('text').text(n => `${n.title.length > labelLimit ? n.title.slice(0, labelLimit - 1) + '…' : n.title}${category(n) ? ` (${n.count})` : ''}`)
      .attr('x', n => width < 600 ? 0 : radius(n) + 9).attr('y', n => width < 600 ? -radius(n) - 9 : 4)
      .attr('text-anchor', width < 600 ? 'middle' : 'start').attr('fill', n => ghost(n) ? '#9b988e' : '#c9c5bc')
      .attr('font-size', width < 600 ? 11 : 12).attr('font-style', n => ghost(n) ? 'italic' : 'normal');
    node.append('title').text(n => n.title);
    const highlight = (id?: string | null) => {
      const related = id ? neighbors.get(id) : null;
      node.attr('opacity', n => !related || related.has(n.id) ? 1 : .24);
      node.select('.node-outline').attr('stroke-width', n => n.id === id ? 2.5 : 1);
      lines.attr('stroke-opacity', e => !id ? .24 : endpoint(e.source) === id || endpoint(e.target) === id ? .85 : .07)
        .attr('stroke-width', e => id && (endpoint(e.source) === id || endpoint(e.target) === id) ? 1.5 : 1);
    };
    emphasize.current = highlight;
    node.on('pointerenter', (_, n) => highlight(n.id)).on('pointerleave', () => highlight(selection.current))
      .on('focus', (_, n) => highlight(n.id)).on('blur', () => highlight(selection.current))
      .on('click', (e, n) => { if (!e.defaultPrevented && !ghost(n)) action.current(n.id); })
      .on('keydown', (e: KeyboardEvent, n) => {
        if ((e.key === 'Enter' || e.key === ' ') && !ghost(n)) { e.preventDefault(); action.current(n.id); }
      });
    const draw = () => {
      nodes.forEach(n => {
        const padding = radius(n) + 48;
        n.x = Math.max(padding, Math.min(width - padding, n.x ?? width / 2));
        n.y = Math.max(padding + 24, Math.min(height - padding - 70, n.y ?? height / 2));
      });
      lines.attr('x1', e => (e.source as Node).x ?? 0).attr('y1', e => (e.source as Node).y ?? 0)
        .attr('x2', e => (e.target as Node).x ?? 0).attr('y2', e => (e.target as Node).y ?? 0);
      node.attr('transform', n => `translate(${n.x},${n.y})`);
    };
    node.call(d3.drag<SVGGElement, Node>().on('start', e => {
      if (!reduced && !e.active) simulation.alphaTarget(.2).restart();
      e.subject.fx = e.subject.x; e.subject.fy = e.subject.y;
    }).on('drag', e => {
      e.subject.fx = e.x; e.subject.fy = e.y;
      if (reduced) { e.subject.x = e.x; e.subject.y = e.y; draw(); }
    }).on('end', e => {
      if (!e.active) simulation.alphaTarget(0);
      if (!reduced) { e.subject.fx = null; e.subject.fy = null; }
    }));
    simulation.on('tick', draw).on('end', () => simulation.stop());
    if (reduced) simulation.stop().tick(180);
    draw(); highlight(selection.current);
    const visibility = () => {
      if (document.hidden) simulation.stop();
      else if (!reduced && simulation.alpha() > simulation.alphaMin()) simulation.restart();
    };
    document.addEventListener('visibilitychange', visibility); visibility();
    return () => {
      simulation.stop(); svg.interrupt(); svg.on('.zoom', null); node.on('.drag', null);
      document.removeEventListener('visibilitychange', visibility);
      emphasize.current = () => {}; controls.current = () => {}; svg.selectAll('*').remove();
    };
  }, [data, dimensions, reduced]);
  const noteCount = data.nodes.filter(n => !ghost(n) && !category(n)).length;
  return <div ref={containerRef} className="graph-workspace w-full h-full relative">
    <svg ref={svgRef} className="w-full h-full" role="group" aria-label="笔记关系图，可拖动、缩放或使用下方列表" style={{ touchAction: 'none' }} />
    <div className="graph-breadcrumb">{scope ? <><button onClick={onBack}>← {graphConfig.backToOverviewLabel}</button><span> / {scope}</span></> : graphConfig.overviewHint}</div>
    <div className="graph-zoom" aria-label="图谱缩放"><button onClick={() => controls.current(1.25)} aria-label="放大图谱">+</button><button onClick={() => controls.current(.8)} aria-label="缩小图谱">−</button><button onClick={() => controls.current(null)} aria-label="重置图谱视图">↺</button></div>
    <details className="graph-list"><summary>可访问列表 · {data.nodes.length} 个节点</summary><ul>
      {data.nodes.map(n => <li key={n.id}>{ghost(n) ? <span>{n.title} <small>未解析</small></span> : <button onClick={() => onNodeClick(n.id)} onFocus={() => emphasize.current(n.id)} onBlur={() => emphasize.current(selectedNodeId)}>{n.title}{category(n) && <small>{n.count} 篇</small>}</button>}</li>)}
    </ul></details>
    <p className="graph-legend">◎ 分类 · ● 笔记 · ◌ 未解析 <span>{scope ? `${noteCount} ${graphConfig.notesLabel} · ${data.edges.length} ${graphConfig.connectionsLabel}` : `${data.nodes.filter(category).length} ${graphConfig.categoriesLabel}`}</span></p>
    {data.nodes.length === 0 && <div className="graph-empty">{graphConfig.emptyGraphLabel}</div>}
  </div>;
}
